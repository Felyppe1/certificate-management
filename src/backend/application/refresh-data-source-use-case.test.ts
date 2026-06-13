import { describe, expect, it, vi } from 'vitest'
import { RefreshDataSourceUseCase } from './refresh-data-source-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { IGoogleDriveGateway, GetFileMetadataOutput } from './interfaces/igoogle-drive-gateway'
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
            columns: [{ name: 'Nome', type: 'string' as const, arrayMetadata: null }],
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
            columns: [{ name: 'Imagem', type: 'string' as const, arrayMetadata: null }],
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
            dataSource:
                overrides?.dataSource !== undefined
                    ? overrides.dataSource
                    : createDataSourceDrive(),
            variableColumnMapping: null,
        })
    }

    class GoogleDriveGatewayStub
        implements
            Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
    {
        async getFileMetadata(): Promise<GetFileMetadataOutput> {
            return {
                name: 'dados-atualizados.csv',
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
                        rows: [{ Nome: 'Maria' }],
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

    class GoogleAuthGatewayStub
        implements Pick<IGoogleAuthGateway, 'checkOrGetNewAccessToken'>
    {
        async checkOrGetNewAccessToken() {
            return null
        }
    }

    it('deve atualizar a fonte de dados a partir do Drive com sucesso', async () => {
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

        class UsersRepositoryStub
            implements Pick<IUsersRepository, 'getById' | 'update'>
        {
            async getById(): Promise<User | null> {
                return null
            }
            async update(): Promise<void> {}
        }

        const useCase = new RefreshDataSourceUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            new GoogleDriveGatewayStub(),
            new GoogleAuthGatewayStub(),
            new SpreadsheetContentExtractorFactoryStub(),
            new UsersRepositoryStub(),
            new TransactionManagerStub(),
        )

        await useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID })

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
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(
                createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED }),
            ),
            update: vi.fn(),
        }

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
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(
                createCertificateEmission({ dataSource: null }),
            ),
            update: vi.fn(),
        }

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
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(
                createCertificateEmission({ dataSource: createDataSourceImage() }),
            ),
            update: vi.fn(),
        }

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
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(
                createCertificateEmission({ dataSource: createDataSourceUpload() }),
            ),
            update: vi.fn(),
        }

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

        class UsersRepositoryStub
            implements Pick<IUsersRepository, 'getById' | 'update'>
        {
            async getById(): Promise<User | null> {
                return null
            }
            async update(): Promise<void> {}
        }

        const useCase = new RefreshDataSourceUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            new PdfDriveGatewayStub(),
            new GoogleAuthGatewayStub(),
            {} as ISpreadsheetContentExtractorFactory,
            new UsersRepositoryStub(),
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID }),
        ).rejects.toThrow(UnsupportedDataSourceMimetypeError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve atualizar os tokens do usuário quando o token do Google precisar ser renovado', async () => {
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

        const userWithGoogle = new User({
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

        const usersRepositoryMock: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(userWithGoogle),
            update: vi.fn(),
        }

        const googleAuthGatewayMock: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        > = {
            checkOrGetNewAccessToken: vi.fn().mockResolvedValue({
                newAccessToken: 'refreshed-token',
                newAccessTokenExpiryDateTime: new Date(),
            }),
        }

        const useCase = new RefreshDataSourceUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            new GoogleDriveGatewayStub(),
            googleAuthGatewayMock,
            new SpreadsheetContentExtractorFactoryStub(),
            usersRepositoryMock,
            new TransactionManagerStub(),
        )

        await useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID })

        expect(usersRepositoryMock.update).toHaveBeenCalled()
    })

    it('deve lançar erro quando o Drive retornar um arquivo de imagem ao atualizar a fonte de dados', async () => {
        const certificateEmission = createCertificateEmission()

        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(certificateEmission),
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

        class UsersRepositoryStub
            implements Pick<IUsersRepository, 'getById' | 'update'>
        {
            async getById(): Promise<User | null> {
                return null
            }
            async update(): Promise<void> {}
        }

        const useCase = new RefreshDataSourceUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            new ImageDriveGatewayStub(),
            new GoogleAuthGatewayStub(),
            {} as ISpreadsheetContentExtractorFactory,
            new UsersRepositoryStub(),
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID }),
        ).rejects.toThrow(DataSourceImageRefreshNotAllowedError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })
})