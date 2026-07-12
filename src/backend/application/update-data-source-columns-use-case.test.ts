import { beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { UpdateDataSourceColumnsUseCase } from './update-data-source-columns-use-case'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'

describe('UpdateDataSourceColumnsUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'

    function createDataSource() {
        return new DataSource({
            files: [
                {
                    fileName: 'dados.csv',
                    storageFileUrl: 'https://storage/dados.csv',
                    driveFileId: null,
                },
            ],
            inputMethod: INPUT_METHOD.UPLOAD,
            fileMimeType: DATA_SOURCE_MIME_TYPE.CSV,
            thumbnailUrl: null,
            columnsRow: 1,
            dataRowStart: 2,
            columns: [
                { name: 'Nome', type: 'string' as const, arrayMetadata: null },
            ],
            googleAccountEmail: null,
        })
    }

    function createCertificateEmission(overrides?: {
        userId?: string
        status?: CERTIFICATE_STATUS
        dataSource?: DataSource | null
    }) {
        return new CertificateEmission({
            id: CERTIFICATE_ID,
            name: 'Certificado',
            userId: overrides?.userId ?? USER_ID,
            template: null,
            createdAt: new Date(),
            status: overrides?.status ?? CERTIFICATE_STATUS.DRAFT,
            dataSource:
                overrides?.dataSource !== undefined
                    ? overrides.dataSource
                    : createDataSource(),
            variableColumnMapping: null,
        })
    }

    let transactionManagerStub: Pick<ITransactionManager, 'run'>

    let certificatesRepositoryMock: {
        getById: Mock<ICertificatesRepository['getById']>
        update: Mock<ICertificatesRepository['update']>
    }

    let dataSourceRowsRepositoryStub: Pick<
        IDataSourceRowsRepository,
        | 'getColumnValuesByCertificateEmissionId'
        | 'resetProcessingStatusByCertificateEmissionId'
    >

    beforeEach(() => {
        transactionManagerStub = {
            async run<T>(work: () => Promise<T>): Promise<T> {
                return work()
            },
        }

        certificatesRepositoryMock = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

        dataSourceRowsRepositoryStub = {
            async getColumnValuesByCertificateEmissionId() {
                return []
            },
            async resetProcessingStatusByCertificateEmissionId() {},
        }
    })

    it('deve atualizar os tipos das colunas da fonte de dados com sucesso', async () => {
        const certificateEmission = createCertificateEmission()

        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const useCase = new UpdateDataSourceColumnsUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            transactionManagerStub,
        )

        const result = await useCase.execute({
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
            columns: [{ name: 'Nome', type: 'string', arrayMetadata: null }],
        })

        expect(result.invalidColumns).toHaveLength(0)
        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(
            certificateEmission,
        )
    })

    it('deve retornar as colunas inválidas sem persistir quando os valores existentes não forem compatíveis com o novo tipo', async () => {
        const certificateEmission = createCertificateEmission()

        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )
        dataSourceRowsRepositoryStub.getColumnValuesByCertificateEmissionId =
            async () => ['texto que nao e numero', 'outro texto']

        const useCase = new UpdateDataSourceColumnsUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            transactionManagerStub,
        )

        const result = await useCase.execute({
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
            columns: [{ name: 'Nome', type: 'number', arrayMetadata: null }],
        })

        expect(result.invalidColumns).toEqual([
            { name: 'Nome', toType: 'number' },
        ])
        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        const useCase = new UpdateDataSourceColumnsUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: 'nao-existe',
                userId: USER_ID,
                columns: [],
            }),
        ).rejects.toThrow(CertificateNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ userId: 'outro-usuario' }),
        )

        const useCase = new UpdateDataSourceColumnsUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
                columns: [],
            }),
        ).rejects.toThrow(NotCertificateOwnerError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado já tiver sido emitida', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED }),
        )

        const useCase = new UpdateDataSourceColumnsUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
                columns: [],
            }),
        ).rejects.toThrow(CertificateEmittedError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando não houver fonte de dados vinculada', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ dataSource: null }),
        )

        const useCase = new UpdateDataSourceColumnsUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
                columns: [],
            }),
        ).rejects.toThrow(DataSourceNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })
})
