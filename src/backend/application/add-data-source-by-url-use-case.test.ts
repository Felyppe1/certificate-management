import { beforeEach, describe, expect, it, Mock, vi } from 'vitest'
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

    let certificatesRepositoryMock: {
        getById: Mock<ICertificatesRepository['getById']>
        update: Mock<ICertificatesRepository['update']>
    }

    let googleDriveGatewayStub: Pick<
        IGoogleDriveGateway,
        'getFileMetadata' | 'downloadFile'
    >

    let spreadsheetContentExtractorFactoryStub: Pick<
        ISpreadsheetContentExtractorFactory,
        'create'
    >

    let transactionManagerStub: Pick<ITransactionManager, 'run'>

    let usersRepositoryStub: Pick<IUsersRepository, 'getById'>

    let dataSourceRowsRepositoryStub: Pick<
        IDataSourceRowsRepository,
        'saveMany' | 'deleteManyByCertificateEmissionId'
    >

    let bucketStub: Pick<IBucket, 'deleteObject'>

    beforeEach(() => {
        certificatesRepositoryMock = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        googleDriveGatewayStub = {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'dados.csv',
                    fileMimeType: DATA_SOURCE_MIME_TYPE.CSV,
                    thumbnailUrl: null,
                }
            },
            async downloadFile(): Promise<Buffer> {
                return Buffer.from('')
            },
        }

        spreadsheetContentExtractorFactoryStub = {
            create() {
                return {
                    async extractColumns() {
                        return {
                            columns: ['Nome'],
                            rows: [{ Nome: 'João' }],
                        }
                    },
                }
            },
        }

        transactionManagerStub = {
            async run<T>(work: () => Promise<T>): Promise<T> {
                return work()
            },
        }

        usersRepositoryStub = {
            async getById(): Promise<User | null> {
                return null
            },
        }

        dataSourceRowsRepositoryStub = {
            async saveMany() {},
            async deleteManyByCertificateEmissionId() {},
        }

        bucketStub = {
            async deleteObject() {},
        }
    })

    it('deve adicionar uma fonte de dados por URL do Drive com sucesso', async () => {
        const certificateEmission = createCertificateEmission()
        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            googleDriveGatewayStub,
            spreadsheetContentExtractorFactoryStub,
            bucketStub,
            transactionManagerStub,
            usersRepositoryStub,
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
        certificatesRepositoryMock.getById.mockResolvedValue(null)

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
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ userId: 'outro-usuario' }),
        )

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
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED }),
        )

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
        const pdfDriveGatewayStub: Pick<
            IGoogleDriveGateway,
            'getFileMetadata' | 'downloadFile'
        > = {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'doc.pdf',
                    fileMimeType: 'application/pdf',
                    thumbnailUrl: null,
                }
            },
            async downloadFile(): Promise<Buffer> {
                return Buffer.from('')
            },
        }

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            pdfDriveGatewayStub,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            usersRepositoryStub,
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
        const imageDriveGatewayStub: Pick<
            IGoogleDriveGateway,
            'getFileMetadata' | 'downloadFile'
        > = {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'foto.png',
                    fileMimeType: DATA_SOURCE_MIME_TYPE.PNG,
                    thumbnailUrl: null,
                }
            },
            async downloadFile(): Promise<Buffer> {
                return Buffer.from('')
            },
        }

        const fiveImageUrls = Array.from(
            { length: 5 },
            (_, i) => `https://drive.google.com/file/d/imageid${i}/view`,
        )

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            imageDriveGatewayStub,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            usersRepositoryStub,
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
        let callCount = 0
        const mixedDriveGatewayStub: Pick<
            IGoogleDriveGateway,
            'getFileMetadata' | 'downloadFile'
        > = {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'file',
                    fileMimeType:
                        callCount++ === 0
                            ? DATA_SOURCE_MIME_TYPE.PNG
                            : DATA_SOURCE_MIME_TYPE.CSV,
                    thumbnailUrl: null,
                }
            },
            async downloadFile(): Promise<Buffer> {
                return Buffer.from('')
            },
        }

        const twoUrls = [
            'https://drive.google.com/file/d/image-id/view',
            'https://drive.google.com/file/d/csv-id/view',
        ]

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            mixedDriveGatewayStub,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            usersRepositoryStub,
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
        const twoCsvUrls = [
            'https://drive.google.com/file/d/csv-id-1/view',
            'https://drive.google.com/file/d/csv-id-2/view',
        ]

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            googleDriveGatewayStub,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            usersRepositoryStub,
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
        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const bucketMock: {
            deleteObject: Mock<IBucket['deleteObject']>
        } = {
            deleteObject: vi.fn(),
        }

        const useCase = new AddDataSourceByUrlUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            googleDriveGatewayStub,
            spreadsheetContentExtractorFactoryStub,
            bucketMock,
            transactionManagerStub,
            usersRepositoryStub,
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            fileUrls: [VALID_DRIVE_URL],
            userId: USER_ID,
        })

        expect(bucketMock.deleteObject).toHaveBeenCalled()
    })
})
