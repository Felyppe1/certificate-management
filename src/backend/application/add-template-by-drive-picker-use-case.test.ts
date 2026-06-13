import { describe, expect, it, vi } from 'vitest'
import { AddTemplateByDrivePickerUseCase } from './add-template-by-drive-picker-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import {
    IFileContentExtractorFactory,
    IFileContentExtractorStrategy,
} from './interfaces/ifile-content-extractor-factory'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { IBucket } from './interfaces/cloud/ibucket'
import {
    GetFileMetadataOutput,
    IGoogleDriveGateway,
} from './interfaces/igoogle-drive-gateway'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IStringVariableExtractor } from './interfaces/istring-variable-extractor'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { User } from '../domain/user'
import { ExternalAccount } from '../domain/external-account'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { GoogleAccountNotFoundError } from '../domain/error/forbidden-error/google-account-not-found-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { UnsupportedTemplateMimetypeError } from '../domain/error/validation-error/unsupported-template-mimetype-error'

describe('AddTemplateByDrivePickerUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'
    const FILE_ID = 'drive-file-abc'

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
            name: 'Name',
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

    class TransactionManagerStub implements Pick<ITransactionManager, 'run'> {
        async run<T>(work: () => Promise<T>): Promise<T> {
            return work()
        }
    }

    class BucketStub implements Pick<IBucket, 'uploadObject'> {
        async uploadObject(): Promise<string> {
            return ''
        }
    }

    class GoogleDriveGatewayStub
        implements
            Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
    {
        async getFileMetadata(): Promise<GetFileMetadataOutput> {
            return {
                name: 'template.docx',
                fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
                thumbnailUrl: null,
            }
        }

        async downloadFile(): Promise<Buffer> {
            return Buffer.from('')
        }
    }

    class GoogleAuthGatewayStub
        implements Pick<IGoogleAuthGateway, 'checkOrGetNewAccessToken'>
    {
        async checkOrGetNewAccessToken() {
            return null
        }
    }

    class FileContentExtractorFactoryStub
        implements Pick<IFileContentExtractorFactory, 'create'>
    {
        create(): IFileContentExtractorStrategy {
            return {
                async extractText(): Promise<string> {
                    return ''
                },
            }
        }
    }

    it('deve adicionar um template via Drive Picker com sucesso', async () => {
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
            'resetProcessingStatusByCertificateEmissionId'
        > = {
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }

        class UsersRepositoryStub
            implements Pick<IUsersRepository, 'getById' | 'update'>
        {
            async getById(): Promise<User | null> {
                return createUser()
            }
            async update(): Promise<void> {}
        }

        const useCase = new AddTemplateByDrivePickerUseCase(
            certificatesRepositoryMock,
            new GoogleDriveGatewayStub(),
            new FileContentExtractorFactoryStub(),
            new UsersRepositoryStub(),
            dataSourceRowsRepositoryStub,
            new GoogleAuthGatewayStub(),
            new BucketStub(),
            new TransactionManagerStub(),
            { extractVariables: () => [] },
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            fileId: FILE_ID,
            userId: USER_ID,
        })

        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(
            certificateEmission,
        )
        expect(certificateEmission.hasTemplate()).toBe(true)
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

        const useCase = new AddTemplateByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IGoogleDriveGateway,
            {} as IFileContentExtractorFactory,
            {} as IUsersRepository,
            {} as IDataSourceRowsRepository,
            {} as IGoogleAuthGateway,
            {} as IBucket,
            {} as ITransactionManager,
            {} as IStringVariableExtractor,
        )

        await expect(
            useCase.execute({
                certificateId: 'nao-existe',
                fileId: FILE_ID,
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

        const useCase = new AddTemplateByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IGoogleDriveGateway,
            {} as IFileContentExtractorFactory,
            {} as IUsersRepository,
            {} as IDataSourceRowsRepository,
            {} as IGoogleAuthGateway,
            {} as IBucket,
            {} as ITransactionManager,
            {} as IStringVariableExtractor,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileId: FILE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(NotCertificateOwnerError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o usuário não tiver conta Google vinculada', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        class UsersRepositoryStub
            implements Pick<IUsersRepository, 'getById' | 'update'>
        {
            async getById(): Promise<User | null> {
                return createUser(false)
            }
            async update(): Promise<void> {}
        }

        const useCase = new AddTemplateByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IGoogleDriveGateway,
            {} as IFileContentExtractorFactory,
            new UsersRepositoryStub(),
            {} as IDataSourceRowsRepository,
            {} as IGoogleAuthGateway,
            {} as IBucket,
            {} as ITransactionManager,
            {} as IStringVariableExtractor,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileId: FILE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(GoogleAccountNotFoundError)

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

        class UsersRepositoryStub
            implements Pick<IUsersRepository, 'getById' | 'update'>
        {
            async getById(): Promise<User | null> {
                return createUser()
            }
            async update(): Promise<void> {}
        }

        const useCase = new AddTemplateByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IGoogleDriveGateway,
            {} as IFileContentExtractorFactory,
            new UsersRepositoryStub(),
            {} as IDataSourceRowsRepository,
            {} as IGoogleAuthGateway,
            {} as IBucket,
            {} as ITransactionManager,
            {} as IStringVariableExtractor,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileId: FILE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(CertificateEmittedError)

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

        class UsersRepositoryStub
            implements Pick<IUsersRepository, 'getById' | 'update'>
        {
            async getById(): Promise<User | null> {
                return createUser()
            }
            async update(): Promise<void> {}
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

        const useCase = new AddTemplateByDrivePickerUseCase(
            certificatesRepositoryMock,
            new PdfDriveGatewayStub(),
            {} as IFileContentExtractorFactory,
            new UsersRepositoryStub(),
            {} as IDataSourceRowsRepository,
            new GoogleAuthGatewayStub(),
            {} as IBucket,
            {} as ITransactionManager,
            {} as IStringVariableExtractor,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                fileId: FILE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(UnsupportedTemplateMimetypeError)

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
            'resetProcessingStatusByCertificateEmissionId'
        > = {
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }

        const usersRepositoryMock: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(createUser()),
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

        const useCase = new AddTemplateByDrivePickerUseCase(
            certificatesRepositoryMock,
            new GoogleDriveGatewayStub(),
            new FileContentExtractorFactoryStub(),
            usersRepositoryMock,
            dataSourceRowsRepositoryStub,
            googleAuthGatewayMock,
            new BucketStub(),
            new TransactionManagerStub(),
            { extractVariables: () => [] },
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            fileId: FILE_ID,
            userId: USER_ID,
        })

        expect(usersRepositoryMock.update).toHaveBeenCalled()
    })

    it('deve resetar o status de processamento das linhas da fonte de dados ao adicionar o template quando houver fonte de dados vinculada', async () => {
        const certificateEmission = createCertificateEmission({
            dataSource: createDataSource(),
        })

        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(certificateEmission),
            update: vi.fn(),
        }

        const dataSourceRowsRepositoryMock: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        > = {
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }

        class UsersRepositoryStub
            implements Pick<IUsersRepository, 'getById' | 'update'>
        {
            async getById(): Promise<User | null> {
                return createUser()
            }
            async update(): Promise<void> {}
        }

        const useCase = new AddTemplateByDrivePickerUseCase(
            certificatesRepositoryMock,
            new GoogleDriveGatewayStub(),
            new FileContentExtractorFactoryStub(),
            new UsersRepositoryStub(),
            dataSourceRowsRepositoryMock,
            new GoogleAuthGatewayStub(),
            new BucketStub(),
            new TransactionManagerStub(),
            { extractVariables: () => [] },
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            fileId: FILE_ID,
            userId: USER_ID,
        })

        expect(
            dataSourceRowsRepositoryMock.resetProcessingStatusByCertificateEmissionId,
        ).toHaveBeenCalledWith(CERTIFICATE_ID)
    })
})