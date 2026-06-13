import { describe, expect, it, vi } from 'vitest'
import { UpdateDataSourceRowsUseCase } from './update-data-source-rows-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
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

    class TransactionManagerStub implements Pick<ITransactionManager, 'run'> {
        async run<T>(work: () => Promise<T>): Promise<T> {
            return work()
        }
    }

    it('deve atualizar os dados das linhas da fonte de dados com sucesso', async () => {
        const certificateEmission = createCertificateEmission()
        const row = createDataSourceRow()

        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(certificateEmission),
            update: vi.fn(),
        }

        const dataSourceRowsRepositoryMock: Pick<
            IDataSourceRowsRepository,
            | 'getByIds'
            | 'updateMany'
            | 'resetProcessingStatusByCertificateEmissionId'
        > = {
            getByIds: vi.fn().mockResolvedValue([row]),
            updateMany: vi.fn(),
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }

        const useCase = new UpdateDataSourceRowsUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryMock,
            new TransactionManagerStub(),
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
        expect(dataSourceRowsRepositoryMock.updateMany).toHaveBeenCalledWith([row])
    })

    it('deve encerrar sem chamar o repositório quando a lista de linhas editadas for vazia', async () => {
        const certificateEmission = createCertificateEmission()

        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(certificateEmission),
            update: vi.fn(),
        }

        const dataSourceRowsRepositoryMock: Pick<
            IDataSourceRowsRepository,
            | 'getByIds'
            | 'updateMany'
            | 'resetProcessingStatusByCertificateEmissionId'
        > = {
            getByIds: vi.fn(),
            updateMany: vi.fn(),
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }

        const useCase = new UpdateDataSourceRowsUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryMock,
            new TransactionManagerStub(),
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
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

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
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi
                .fn()
                .mockResolvedValue(
                    createCertificateEmission({ userId: 'outro-usuario' }),
                ),
            update: vi.fn(),
        }

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
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(
                createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED }),
            ),
            update: vi.fn(),
        }

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
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(
                createCertificateEmission({ dataSource: createDataSourceDrive() }),
            ),
            update: vi.fn(),
        }

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

        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(certificateEmission),
            update: vi.fn(),
        }

        const dataSourceRowsRepositoryMock: Pick<
            IDataSourceRowsRepository,
            | 'getByIds'
            | 'updateMany'
            | 'resetProcessingStatusByCertificateEmissionId'
        > = {
            getByIds: vi.fn().mockResolvedValue([]),
            updateMany: vi.fn(),
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }

        const useCase = new UpdateDataSourceRowsUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryMock,
            new TransactionManagerStub(),
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