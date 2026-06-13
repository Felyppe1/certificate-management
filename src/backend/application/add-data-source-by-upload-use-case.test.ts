import { describe, expect, it, vi } from 'vitest'
import { AddDataSourceByUploadUseCase } from './add-data-source-by-upload-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { IBucket } from './interfaces/cloud/ibucket'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { User } from '../domain/user'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { DataSourceFileRequiredError } from '../domain/error/validation-error/data-source-file-required-error'
import { UnsupportedDataSourceMimetypeError } from '../domain/error/validation-error/unsupported-data-source-mimetype-error'
import { DataSourceImageFilesExceededError } from '../domain/error/validation-error/data-source-image-files-exceeded-error'
import { DataSourceAllFilesNotImagesError } from '../domain/error/validation-error/data-source-all-files-not-images-error'

describe('AddDataSourceByUploadUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'

    function createDataSourceWithStorage() {
        return new DataSource({
            files: [
                {
                    fileName: 'antigo.csv',
                    storageFileUrl: 'https://storage/antigo.csv',
                    driveFileId: null,
                },
            ],
            inputMethod: INPUT_METHOD.UPLOAD,
            fileMimeType: DATA_SOURCE_MIME_TYPE.CSV,
            thumbnailUrl: null,
            columnsRow: 1,
            dataRowStart: 2,
            columns: [{ name: 'Nome', type: 'string' as const, arrayMetadata: null }],
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
            dataSource: overrides?.dataSource ?? null,
            variableColumnMapping: null,
        })
    }

    function createCsvFile() {
        return new File([Buffer.from('Nome\nJoão')], 'dados.csv', {
            type: DATA_SOURCE_MIME_TYPE.CSV,
        })
    }

    function createImageFile(mimeType = DATA_SOURCE_MIME_TYPE.PNG) {
        return new File([Buffer.from('imgdata')], 'foto.png', { type: mimeType })
    }

    class BucketStub implements Pick<IBucket, 'uploadObject' | 'deleteObject'> {
        async uploadObject(): Promise<string> {
            return ''
        }
        async deleteObject(): Promise<void> {}
    }

    class TransactionManagerStub implements Pick<ITransactionManager, 'run'> {
        async run<T>(work: () => Promise<T>): Promise<T> {
            return work()
        }
    }

    class SpreadsheetContentExtractorFactoryStub
        implements Pick<ISpreadsheetContentExtractorFactory, 'create'>
    {
        create() {
            return {
                async extractColumns() {
                    return {
                        columns: ['Nome'],
                        rows: [{ Nome: 'João' }],
                    }
                },
            }
        }
    }

    class UsersRepositoryStub implements Pick<IUsersRepository, 'getById'> {
        async getById(): Promise<User | null> {
            return null
        }
    }

    it('deve adicionar uma fonte de dados por upload com sucesso', async () => {
        const certificateEmission = createCertificateEmission()

        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(certificateEmission),
            update: vi.fn(),
        }

        const dataSourceRowsRepositoryStub: Pick<
            IDataSourceRowsRepository,
            'saveMany' | 'deleteManyByCertificateEmissionId'
        > = {
            saveMany: vi.fn(),
            deleteManyByCertificateEmissionId: vi.fn(),
        }

        const useCase = new AddDataSourceByUploadUseCase(
            new BucketStub(),
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            new SpreadsheetContentExtractorFactoryStub(),
            new TransactionManagerStub(),
            new UsersRepositoryStub(),
        )

        await useCase.execute({
            files: [createCsvFile()],
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
        })

        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(
            certificateEmission,
        )
        expect(certificateEmission.hasDataSource()).toBe(true)
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

        const useCase = new AddDataSourceByUploadUseCase(
            {} as IBucket,
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ISpreadsheetContentExtractorFactory,
            {} as ITransactionManager,
            {} as IUsersRepository,
        )

        await expect(
            useCase.execute({
                files: [createCsvFile()],
                certificateId: 'nao-existe',
                userId: USER_ID,
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

        const useCase = new AddDataSourceByUploadUseCase(
            {} as IBucket,
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ISpreadsheetContentExtractorFactory,
            {} as ITransactionManager,
            {} as IUsersRepository,
        )

        await expect(
            useCase.execute({
                files: [createCsvFile()],
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
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

        const useCase = new AddDataSourceByUploadUseCase(
            {} as IBucket,
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ISpreadsheetContentExtractorFactory,
            {} as ITransactionManager,
            {} as IUsersRepository,
        )

        await expect(
            useCase.execute({
                files: [createCsvFile()],
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(CertificateEmittedError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando nenhum arquivo for enviado', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        const useCase = new AddDataSourceByUploadUseCase(
            {} as IBucket,
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ISpreadsheetContentExtractorFactory,
            {} as ITransactionManager,
            {} as IUsersRepository,
        )

        await expect(
            useCase.execute({
                files: [],
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(DataSourceFileRequiredError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o formato do arquivo não for suportado como fonte de dados', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        const useCase = new AddDataSourceByUploadUseCase(
            {} as IBucket,
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ISpreadsheetContentExtractorFactory,
            {} as ITransactionManager,
            {} as IUsersRepository,
        )

        const pdfFile = new File([Buffer.from('content')], 'doc.pdf', {
            type: 'application/pdf',
        })

        await expect(
            useCase.execute({
                files: [pdfFile],
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(UnsupportedDataSourceMimetypeError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o número de imagens ultrapassar o limite permitido', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        const useCase = new AddDataSourceByUploadUseCase(
            {} as IBucket,
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ISpreadsheetContentExtractorFactory,
            {} as ITransactionManager,
            {} as IUsersRepository,
        )

        const fiveImages = Array.from({ length: 5 }, () => createImageFile())

        await expect(
            useCase.execute({
                files: fiveImages,
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(DataSourceImageFilesExceededError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando os arquivos enviados não forem todos imagens', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        const useCase = new AddDataSourceByUploadUseCase(
            {} as IBucket,
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ISpreadsheetContentExtractorFactory,
            {} as ITransactionManager,
            {} as IUsersRepository,
        )

        await expect(
            useCase.execute({
                files: [createImageFile(), createCsvFile()],
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(DataSourceAllFilesNotImagesError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando forem enviados múltiplos arquivos que não sejam planilhas individuais', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        const useCase = new AddDataSourceByUploadUseCase(
            {} as IBucket,
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ISpreadsheetContentExtractorFactory,
            {} as ITransactionManager,
            {} as IUsersRepository,
        )

        await expect(
            useCase.execute({
                files: [createCsvFile(), createCsvFile()],
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(DataSourceAllFilesNotImagesError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve excluir os arquivos antigos do storage ao substituir a fonte de dados', async () => {
        const certificateEmission = createCertificateEmission({
            dataSource: createDataSourceWithStorage(),
        })

        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(certificateEmission),
            update: vi.fn(),
        }

        const dataSourceRowsRepositoryStub: Pick<
            IDataSourceRowsRepository,
            'saveMany' | 'deleteManyByCertificateEmissionId'
        > = {
            saveMany: vi.fn(),
            deleteManyByCertificateEmissionId: vi.fn(),
        }

        const bucketMock: Pick<IBucket, 'uploadObject' | 'deleteObject'> = {
            uploadObject: vi.fn().mockResolvedValue(''),
            deleteObject: vi.fn(),
        }

        const useCase = new AddDataSourceByUploadUseCase(
            bucketMock,
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            new SpreadsheetContentExtractorFactoryStub(),
            new TransactionManagerStub(),
            new UsersRepositoryStub(),
        )

        await useCase.execute({
            files: [createCsvFile()],
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
        })

        expect(bucketMock.deleteObject).toHaveBeenCalled()
    })
})