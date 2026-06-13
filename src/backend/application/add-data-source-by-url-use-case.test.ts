import { describe, expect, it, vi } from 'vitest'
import { AddDataSourceByUrlUseCase } from './add-data-source-by-url-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import {
    IGoogleDriveGateway,
    GetFileMetadataOutput,
} from './interfaces/igoogle-drive-gateway'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { IBucket } from './interfaces/cloud/ibucket'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
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
import { UnexistentDataSourceDriveFileIdError } from '../domain/error/validation-error/unexistent-data-source-drive-file-id-error'
import { UnsupportedDataSourceMimetypeError } from '../domain/error/validation-error/unsupported-data-source-mimetype-error'
import { DataSourceImageFilesExceededError } from '../domain/error/validation-error/data-source-image-files-exceeded-error'
import { DataSourceAllFilesNotImagesError } from '../domain/error/validation-error/data-source-all-files-not-images-error'

describe('AddDataSourceByUrlUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'
    const VALID_DRIVE_URL =
        'https://drive.google.com/file/d/abc123fileId/view?usp=sharing'

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
            dataSource: overrides?.dataSource ?? null,
            variableColumnMapping: null,
        })
    }

    class GoogleDriveGatewayStub
        implements Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
    {
        async getFileMetadata(): Promise<GetFileMetadataOutput> {
            return {
                name: 'dados.csv',
                fileMimeType: DATA_SOURCE_MIME_TYPE.CSV,
                thumbnailUrl: null,
            }
        }

        async downloadFile(): Promise<Buffer> {
            return Buffer.from('')
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

    class TransactionManagerStub implements Pick<ITransactionManager, 'run'> {
        async run<T>(work: () => Promise<T>): Promise<T> {
            return work()
        }
    }

    class UsersRepositoryStub implements Pick<IUsersRepository, 'getById'> {
        async getById(): Promise<User | null> {
            return null
        }
    }

    it('deve adicionar uma fonte de dados por URL do Drive com sucesso', async () => {
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

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            new GoogleDriveGatewayStub(),
            new SpreadsheetContentExtractorFactoryStub(),
            { async deleteObject() {} } as Pick<IBucket, 'deleteObject'>,
            new TransactionManagerStub(),
            new UsersRepositoryStub(),
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            fileUrls: [VALID_DRIVE_URL],
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

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            {} as IUsersRepository,
        )

        await expect(
            useCase.execute({
                certificateId: 'nao-existe',
                fileUrls: [VALID_DRIVE_URL],
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

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            {} as IUsersRepository,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileUrls: [VALID_DRIVE_URL],
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
            getById: vi
                .fn()
                .mockResolvedValue(
                    createCertificateEmission({
                        status: CERTIFICATE_STATUS.EMITTED,
                    }),
                ),
            update: vi.fn(),
        }

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            {} as IUsersRepository,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileUrls: [VALID_DRIVE_URL],
                userId: USER_ID,
            }),
        ).rejects.toThrow(CertificateEmittedError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a URL não contiver um ID válido do Drive', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            {} as IUsersRepository,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileUrls: ['https://example.com/sem-id'],
                userId: USER_ID,
            }),
        ).rejects.toThrow(UnexistentDataSourceDriveFileIdError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o formato do arquivo do Drive não for suportado', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        class PdfDriveGatewayStub
            implements
                Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
        {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'doc.pdf',
                    fileMimeType: 'application/pdf',
                    thumbnailUrl: null,
                }
            }
            async downloadFile(): Promise<Buffer> {
                return Buffer.from('')
            }
        }

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            new PdfDriveGatewayStub(),
            {} as ISpreadsheetContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            new UsersRepositoryStub(),
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileUrls: [VALID_DRIVE_URL],
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

        class ImageDriveGatewayStub
            implements
                Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
        {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'foto.png',
                    fileMimeType: DATA_SOURCE_MIME_TYPE.PNG,
                    thumbnailUrl: null,
                }
            }
            async downloadFile(): Promise<Buffer> {
                return Buffer.from('')
            }
        }

        const fiveImageUrls = Array.from(
            { length: 5 },
            (_, i) => `https://drive.google.com/file/d/imageid${i}/view`,
        )

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            new ImageDriveGatewayStub(),
            {} as ISpreadsheetContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            new UsersRepositoryStub(),
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileUrls: fiveImageUrls,
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

        let callCount = 0
        class MixedDriveGatewayStub
            implements
                Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
        {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'file',
                    fileMimeType:
                        callCount++ === 0
                            ? DATA_SOURCE_MIME_TYPE.PNG
                            : DATA_SOURCE_MIME_TYPE.CSV,
                    thumbnailUrl: null,
                }
            }
            async downloadFile(): Promise<Buffer> {
                return Buffer.from('')
            }
        }

        const twoUrls = [
            'https://drive.google.com/file/d/image-id/view',
            'https://drive.google.com/file/d/csv-id/view',
        ]

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            new MixedDriveGatewayStub(),
            {} as ISpreadsheetContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            new UsersRepositoryStub(),
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileUrls: twoUrls,
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

        const twoCsvUrls = [
            'https://drive.google.com/file/d/csv-id-1/view',
            'https://drive.google.com/file/d/csv-id-2/view',
        ]

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            new GoogleDriveGatewayStub(),
            {} as ISpreadsheetContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            new UsersRepositoryStub(),
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileUrls: twoCsvUrls,
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

        const bucketMock: Pick<IBucket, 'deleteObject'> = {
            deleteObject: vi.fn(),
        }

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            new GoogleDriveGatewayStub(),
            new SpreadsheetContentExtractorFactoryStub(),
            bucketMock,
            new TransactionManagerStub(),
            new UsersRepositoryStub(),
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            fileUrls: [VALID_DRIVE_URL],
            userId: USER_ID,
        })

        expect(bucketMock.deleteObject).toHaveBeenCalled()
    })
})
