import { beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { UpdateDataSourceRowsUseCase } from './update-data-source-rows-use-case'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { DataSourceRow } from '../domain/data-source-row'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { DataSourceInvalidInputMethodError } from '../domain/error/validation-error/data-source-invalid-input-method-error'
import { DataSourceRowsNotFoundError } from '../domain/error/validation-error/data-source-rows-not-found-error'

describe('UpdateDataSourceRowsUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'

    const DEFAULT_COLUMNS = [
        { name: 'Nome', type: 'string' as const, arrayMetadata: null },
    ]

    function createDataSourceUpload() {
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
            columns: DEFAULT_COLUMNS,
            googleAccountEmail: null,
        })
    }

    function createDataSourceDrive() {
        return new DataSource({
            files: [
                {
                    fileName: 'dados.csv',
                    driveFileId: 'drive-id',
                    storageFileUrl: null,
                },
            ],
            inputMethod: INPUT_METHOD.GOOGLE_DRIVE,
            fileMimeType: DATA_SOURCE_MIME_TYPE.CSV,
            thumbnailUrl: null,
            columnsRow: 1,
            dataRowStart: 2,
            columns: DEFAULT_COLUMNS,
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
                    : createDataSourceUpload(),
            variableColumnMapping: null,
        })
    }

    function createDataSourceRow() {
        return DataSourceRow.create({
            certificateEmissionId: CERTIFICATE_ID,
            data: { Nome: 'João' },
            dataSourceColumns: DEFAULT_COLUMNS,
            sourceRowIndex: 0,
        })
    }

    let transactionManagerStub: Pick<ITransactionManager, 'run'>

    let certificatesRepositoryMock: {
        getById: Mock<ICertificatesRepository['getById']>
        update: Mock<ICertificatesRepository['update']>
    }

    let dataSourceRowsRepositoryMock: {
        getByIds: Mock<IDataSourceRowsRepository['getByIds']>
        updateMany: Mock<IDataSourceRowsRepository['updateMany']>
        resetProcessingStatusByCertificateEmissionId: Mock<
            IDataSourceRowsRepository['resetProcessingStatusByCertificateEmissionId']
        >
    }

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
        dataSourceRowsRepositoryMock = {
            getByIds: vi.fn().mockResolvedValue([]),
            updateMany: vi.fn(),
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }
    })

    it('deve atualizar os dados das linhas da fonte de dados com sucesso', async () => {
        const certificateEmission = createCertificateEmission()
        const row = createDataSourceRow()

        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )
        dataSourceRowsRepositoryMock.getByIds.mockResolvedValue([row])

        const useCase = new UpdateDataSourceRowsUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryMock,
            transactionManagerStub,
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
            editedRows: [
                {
                    rowId: row.getId(),
                    data: [{ column: 'Nome', newValue: 'Maria' }],
                },
            ],
        })

        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(
            certificateEmission,
        )
        expect(dataSourceRowsRepositoryMock.updateMany).toHaveBeenCalledWith([
            row,
        ])
    })

    it('deve encerrar sem chamar o repositório quando a lista de linhas editadas for vazia', async () => {
        const certificateEmission = createCertificateEmission()

        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const useCase = new UpdateDataSourceRowsUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryMock,
            transactionManagerStub,
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
            editedRows: [],
        })

        expect(dataSourceRowsRepositoryMock.getByIds).not.toHaveBeenCalled()
        expect(dataSourceRowsRepositoryMock.updateMany).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(null)

        const useCase = new UpdateDataSourceRowsUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: 'nao-existe',
                userId: USER_ID,
                editedRows: [],
            }),
        ).rejects.toThrow(CertificateNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ userId: 'outro-usuario' }),
        )

        const useCase = new UpdateDataSourceRowsUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
                editedRows: [],
            }),
        ).rejects.toThrow(NotCertificateOwnerError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado já tiver sido emitida', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED }),
        )

        const useCase = new UpdateDataSourceRowsUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
                editedRows: [],
            }),
        ).rejects.toThrow(CertificateEmittedError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a fonte de dados não for do método UPLOAD', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ dataSource: createDataSourceDrive() }),
        )

        const useCase = new UpdateDataSourceRowsUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
                editedRows: [],
            }),
        ).rejects.toThrow(DataSourceInvalidInputMethodError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando algum ID de linha não for encontrado no repositório', async () => {
        const certificateEmission = createCertificateEmission()

        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )
        dataSourceRowsRepositoryMock.getByIds.mockResolvedValue([])

        const useCase = new UpdateDataSourceRowsUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryMock,
            transactionManagerStub,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
                editedRows: [
                    {
                        rowId: 'id-inexistente',
                        data: [{ column: 'Nome', newValue: 'Teste' }],
                    },
                ],
            }),
        ).rejects.toThrow(DataSourceRowsNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })
})
