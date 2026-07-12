import { beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { AddDataSourceByDrivePickerUseCase } from './add-data-source-by-drive-picker-use-case'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import {
    IGoogleDriveGateway,
    GetFileMetadataOutput,
} from './interfaces/gateway/igoogle-drive-gateway'
import { ISpreadsheetContentExtractorFactory } from './interfaces/extraction/ispreadsheet-content-extractor-factory'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { IGoogleAuthGateway } from './interfaces/gateway/igoogle-auth-gateway'
import { IBucket } from './interfaces/storage/ibucket'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { User } from '../domain/user'
import { ExternalAccount } from '../domain/external-account'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { GoogleAccountNotFoundError } from '../domain/error/forbidden-error/google-account-not-found-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { UnsupportedDataSourceMimetypeError } from '../domain/error/validation-error/unsupported-data-source-mimetype-error'
import { DataSourceImageFilesExceededError } from '../domain/error/validation-error/data-source-image-files-exceeded-error'
import { DataSourceAllFilesNotImagesError } from '../domain/error/validation-error/data-source-all-files-not-images-error'

describe('AddDataSourceByDrivePickerUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'
    const FILE_ID = 'planilha-abc'

    function createDataSource() {
        return new DataSource({
            files: [
                {
                    fileName: 'antigo.png',
                    storageFileUrl: 'https://storage/antigo.png',
                    driveFileId: null,
                },
            ],
            inputMethod: INPUT_METHOD.UPLOAD,
            fileMimeType: DATA_SOURCE_MIME_TYPE.PNG,
            thumbnailUrl: null,
            columnsRow: 1,
            dataRowStart: 2,
            columns: [
                {
                    name: 'Imagem',
                    type: 'string' as const,
                    arrayMetadata: null,
                },
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

    function createUser(withGoogle = true) {
        return new User({
            id: USER_ID,
            email: null,
            isEmailVerified: false,
            name: 'User',
            passwordHash: null,
            credits: 300,
            externalAccounts: withGoogle
                ? [
                      new ExternalAccount({
                          provider: 'GOOGLE',
                          providerUserId: 'google-user-id',
                          email: 'user@test.com',
                          accessToken: 'access-token',
                          refreshToken: 'refresh-token',
                          accessTokenExpiryDateTime: new Date(
                              Date.now() + 3_600_000,
                          ),
                          refreshTokenExpiryDateTime: null,
                      }),
                  ]
                : [],
            emailVerificationCode: null,
            resetPasswordCode: null,
            emailChangeCode: null,
        })
    }

    let certificatesRepositoryMock: {
        getById: Mock<ICertificatesRepository['getById']>
        update: Mock<ICertificatesRepository['update']>
    }

    let dataSourceRowsRepositoryStub: Pick<
        IDataSourceRowsRepository,
        'saveMany' | 'deleteManyByCertificateEmissionId'
    >

    let googleDriveGatewayStub: Pick<
        IGoogleDriveGateway,
        'getFileMetadata' | 'downloadFile'
    >

    let spreadsheetContentExtractorFactoryStub: Pick<
        ISpreadsheetContentExtractorFactory,
        'create'
    >

    let transactionManagerStub: Pick<ITransactionManager, 'run'>

    let googleAuthGatewayStub: Pick<
        IGoogleAuthGateway,
        'checkOrGetNewAccessToken'
    >

    let usersRepositoryStub: Pick<IUsersRepository, 'getById' | 'update'>

    let bucketStub: Pick<IBucket, 'deleteObject'>

    beforeEach(() => {
        certificatesRepositoryMock = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        dataSourceRowsRepositoryStub = {
            async saveMany() {},
            async deleteManyByCertificateEmissionId() {},
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

        googleAuthGatewayStub = {
            async checkOrGetNewAccessToken() {
                return null
            },
        }

        usersRepositoryStub = {
            async getById(): Promise<User | null> {
                return createUser()
            },
            async update(): Promise<void> {},
        }

        bucketStub = {
            async deleteObject() {},
        }
    })

    it('deve adicionar uma fonte de dados via Drive Picker com sucesso', async () => {
        const certificateEmission = createCertificateEmission()
        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            googleDriveGatewayStub,
            spreadsheetContentExtractorFactoryStub,
            usersRepositoryStub,
            googleAuthGatewayStub,
            bucketStub,
            transactionManagerStub,
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            fileIds: [FILE_ID],
            userId: USER_ID,
        })

        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(
            certificateEmission,
        )
        expect(certificateEmission.hasDataSource()).toBe(true)
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(null)

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IUsersRepository,
            {} as IGoogleAuthGateway,
            {} as IBucket,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: 'nao-existe',
                fileIds: [FILE_ID],
                userId: USER_ID,
            }),
        ).rejects.toThrow(CertificateNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ userId: 'outro-usuario' }),
        )

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IUsersRepository,
            {} as IGoogleAuthGateway,
            {} as IBucket,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileIds: [FILE_ID],
                userId: USER_ID,
            }),
        ).rejects.toThrow(NotCertificateOwnerError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o usuário não tiver conta Google vinculada', async () => {
        usersRepositoryStub.getById = async () => createUser(false)

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as ISpreadsheetContentExtractorFactory,
            usersRepositoryStub,
            {} as IGoogleAuthGateway,
            {} as IBucket,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileIds: [FILE_ID],
                userId: USER_ID,
            }),
        ).rejects.toThrow(GoogleAccountNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado já tiver sido emitida', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED }),
        )

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as ISpreadsheetContentExtractorFactory,
            usersRepositoryStub,
            {} as IGoogleAuthGateway,
            {} as IBucket,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileIds: [FILE_ID],
                userId: USER_ID,
            }),
        ).rejects.toThrow(CertificateEmittedError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o formato do arquivo do Drive não for suportado como fonte de dados', async () => {
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

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            pdfDriveGatewayStub,
            {} as ISpreadsheetContentExtractorFactory,
            usersRepositoryStub,
            googleAuthGatewayStub,
            {} as IBucket,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileIds: [FILE_ID],
                userId: USER_ID,
            }),
        ).rejects.toThrow(UnsupportedDataSourceMimetypeError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve atualizar os tokens do usuário quando o token do Google precisar ser renovado', async () => {
        const usersRepositoryMock: {
            getById: Mock<IUsersRepository['getById']>
            update: Mock<IUsersRepository['update']>
        } = {
            getById: vi.fn().mockResolvedValue(createUser()),
            update: vi.fn(),
        }

        const googleAuthGatewayMock: {
            checkOrGetNewAccessToken: Mock<
                IGoogleAuthGateway['checkOrGetNewAccessToken']
            >
        } = {
            checkOrGetNewAccessToken: vi.fn().mockResolvedValue({
                newAccessToken: 'refreshed-token',
                newAccessTokenExpiryDateTime: new Date(),
            }),
        }

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            googleDriveGatewayStub,
            spreadsheetContentExtractorFactoryStub,
            usersRepositoryMock,
            googleAuthGatewayMock,
            bucketStub,
            transactionManagerStub,
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            fileIds: [FILE_ID],
            userId: USER_ID,
        })

        expect(usersRepositoryMock.update).toHaveBeenCalled()
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

        const fiveImageIds = Array.from(
            { length: 5 },
            (_, i) => `image-id-${i}`,
        )

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            imageDriveGatewayStub,
            {} as ISpreadsheetContentExtractorFactory,
            usersRepositoryStub,
            googleAuthGatewayStub,
            {} as IBucket,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileIds: fiveImageIds,
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

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            mixedDriveGatewayStub,
            {} as ISpreadsheetContentExtractorFactory,
            usersRepositoryStub,
            googleAuthGatewayStub,
            {} as IBucket,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileIds: ['image-id', 'csv-id'],
                userId: USER_ID,
            }),
        ).rejects.toThrow(DataSourceAllFilesNotImagesError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando forem enviados múltiplos arquivos que não sejam imagens', async () => {
        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            googleDriveGatewayStub,
            {} as ISpreadsheetContentExtractorFactory,
            usersRepositoryStub,
            googleAuthGatewayStub,
            {} as IBucket,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileIds: ['csv-id-1', 'csv-id-2'],
                userId: USER_ID,
            }),
        ).rejects.toThrow(DataSourceAllFilesNotImagesError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve excluir os arquivos antigos do storage ao substituir a fonte de dados', async () => {
        const certificateEmission = createCertificateEmission({
            dataSource: createDataSource(),
        })
        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const bucketMock: {
            deleteObject: Mock<IBucket['deleteObject']>
        } = {
            deleteObject: vi.fn(),
        }

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            googleDriveGatewayStub,
            spreadsheetContentExtractorFactoryStub,
            usersRepositoryStub,
            googleAuthGatewayStub,
            bucketMock,
            transactionManagerStub,
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            fileIds: [FILE_ID],
            userId: USER_ID,
        })

        expect(bucketMock.deleteObject).toHaveBeenCalled()
    })
})
