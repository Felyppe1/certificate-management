import { beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { RefreshDataSourceUseCase } from './refresh-data-source-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import {
    IGoogleDriveGateway,
    GetFileMetadataOutput,
} from './interfaces/igoogle-drive-gateway'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
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
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'
import { DataSourceImageRefreshNotAllowedError } from '../domain/error/validation-error/data-source-image-refresh-not-allowed-error'
import { UnexistentDataSourceDriveFileIdError } from '../domain/error/validation-error/unexistent-data-source-drive-file-id-error'
import { UnsupportedDataSourceMimetypeError } from '../domain/error/validation-error/unsupported-data-source-mimetype-error'

describe('RefreshDataSourceUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'
    const DRIVE_FILE_ID = 'planilha-drive-abc'

    function createDataSourceDrive() {
        return new DataSource({
            files: [
                {
                    fileName: 'dados.csv',
                    driveFileId: DRIVE_FILE_ID,
                    storageFileUrl: null,
                },
            ],
            inputMethod: INPUT_METHOD.GOOGLE_DRIVE,
            fileMimeType: DATA_SOURCE_MIME_TYPE.CSV,
            thumbnailUrl: null,
            columnsRow: 1,
            dataRowStart: 2,
            columns: [
                { name: 'Nome', type: 'string' as const, arrayMetadata: null },
            ],
            googleAccountEmail: 'user@test.com',
        })
    }

    function createDataSourceImage() {
        return new DataSource({
            files: [
                {
                    fileName: 'foto.png',
                    driveFileId: DRIVE_FILE_ID,
                    storageFileUrl: null,
                },
            ],
            inputMethod: INPUT_METHOD.GOOGLE_DRIVE,
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

    function createDataSourceUpload() {
        return new DataSource({
            files: [
                {
                    fileName: 'dados.csv',
                    driveFileId: null,
                    storageFileUrl: 'https://storage/dados.csv',
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
                    : createDataSourceDrive(),
            variableColumnMapping: null,
        })
    }

    function createUserWithGoogle() {
        return new User({
            id: USER_ID,
            email: null,
            isEmailVerified: false,
            name: 'User',
            passwordHash: null,
            credits: 300,
            externalAccounts: [
                new ExternalAccount({
                    provider: 'GOOGLE',
                    providerUserId: 'google-user-id',
                    email: 'user@test.com',
                    accessToken: 'access-token',
                    refreshToken: 'refresh-token',
                    accessTokenExpiryDateTime: new Date(Date.now() + 3_600_000),
                    refreshTokenExpiryDateTime: null,
                }),
            ],
            emailVerificationCode: null,
            resetPasswordCode: null,
            emailChangeCode: null,
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

    let googleAuthGatewayStub: Pick<
        IGoogleAuthGateway,
        'checkOrGetNewAccessToken'
    >

    let usersRepositoryStub: Pick<IUsersRepository, 'getById' | 'update'>

    let dataSourceRowsRepositoryStub: Pick<
        IDataSourceRowsRepository,
        'saveMany' | 'deleteManyByCertificateEmissionId'
    >

    beforeEach(() => {
        certificatesRepositoryMock = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        googleDriveGatewayStub = {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'dados-atualizados.csv',
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
                            rows: [{ Nome: 'Maria' }],
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
                return null
            },
            async update(): Promise<void> {},
        }

        dataSourceRowsRepositoryStub = {
            async saveMany() {},
            async deleteManyByCertificateEmissionId() {},
        }
    })

    it('deve atualizar a fonte de dados a partir do Drive com sucesso', async () => {
        const certificateEmission = createCertificateEmission()
        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const useCase = new RefreshDataSourceUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            googleDriveGatewayStub,
            googleAuthGatewayStub,
            spreadsheetContentExtractorFactoryStub,
            usersRepositoryStub,
            transactionManagerStub,
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
        })

        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(
            certificateEmission,
        )
        expect(certificateEmission.hasDataSource()).toBe(true)
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(null)

        const useCase = new RefreshDataSourceUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as IGoogleAuthGateway,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IUsersRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({ certificateId: 'nao-existe', userId: USER_ID }),
        ).rejects.toThrow(CertificateNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ userId: 'outro-usuario' }),
        )

        const useCase = new RefreshDataSourceUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as IGoogleAuthGateway,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IUsersRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID }),
        ).rejects.toThrow(NotCertificateOwnerError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado já tiver sido emitida', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED }),
        )

        const useCase = new RefreshDataSourceUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as IGoogleAuthGateway,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IUsersRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID }),
        ).rejects.toThrow(CertificateEmittedError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando não houver fonte de dados vinculada', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ dataSource: null }),
        )

        const useCase = new RefreshDataSourceUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as IGoogleAuthGateway,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IUsersRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID }),
        ).rejects.toThrow(DataSourceNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a fonte de dados for do tipo imagem', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ dataSource: createDataSourceImage() }),
        )

        const useCase = new RefreshDataSourceUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as IGoogleAuthGateway,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IUsersRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID }),
        ).rejects.toThrow(DataSourceImageRefreshNotAllowedError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a fonte de dados não tiver ID de arquivo do Drive vinculado', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ dataSource: createDataSourceUpload() }),
        )

        const useCase = new RefreshDataSourceUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as IGoogleAuthGateway,
            {} as ISpreadsheetContentExtractorFactory,
            {} as IUsersRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID }),
        ).rejects.toThrow(UnexistentDataSourceDriveFileIdError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o formato do arquivo retornado pelo Drive não for suportado', async () => {
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

        const useCase = new RefreshDataSourceUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            pdfDriveGatewayStub,
            googleAuthGatewayStub,
            {} as ISpreadsheetContentExtractorFactory,
            usersRepositoryStub,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID }),
        ).rejects.toThrow(UnsupportedDataSourceMimetypeError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve atualizar os tokens do usuário quando o token do Google precisar ser renovado', async () => {
        const certificateEmission = createCertificateEmission()
        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const usersRepositoryMock: {
            getById: Mock<IUsersRepository['getById']>
            update: Mock<IUsersRepository['update']>
        } = {
            getById: vi.fn().mockResolvedValue(createUserWithGoogle()),
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

        const useCase = new RefreshDataSourceUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            googleDriveGatewayStub,
            googleAuthGatewayMock,
            spreadsheetContentExtractorFactoryStub,
            usersRepositoryMock,
            transactionManagerStub,
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
        })

        expect(usersRepositoryMock.update).toHaveBeenCalled()
    })

    it('deve lançar erro quando o Drive retornar um arquivo de imagem ao atualizar a fonte de dados', async () => {
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

        const useCase = new RefreshDataSourceUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            imageDriveGatewayStub,
            googleAuthGatewayStub,
            {} as ISpreadsheetContentExtractorFactory,
            usersRepositoryStub,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID }),
        ).rejects.toThrow(DataSourceImageRefreshNotAllowedError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })
})
