import { describe, expect, it, vi } from 'vitest'
import { AddTemplateByUrlUseCase } from './add-template-by-url-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IStringVariableExtractor } from './interfaces/istring-variable-extractor'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { User } from '../domain/user'
import { ExternalAccount } from '../domain/external-account'
import {
    GetFileMetadataOutput,
    IGoogleDriveGateway,
} from './interfaces/igoogle-drive-gateway'
import { TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import {
    IFileContentExtractorStrategy,
    IFileContentExtractorFactory,
} from './interfaces/ifile-content-extractor-factory'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { UnexistentTemplateDriveFileIdError } from '../domain/error/validation-error/unexistent-template-drive-file-id-error'
import { UnsupportedTemplateMimetypeError } from '../domain/error/validation-error/unsupported-template-mimetype-error'
import { IBucket } from './interfaces/cloud/ibucket'

describe('AddTemplateByUrlUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'
    const VALID_DRIVE_URL = 'https://drive.google.com/file/d/abc123/view'

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

    function createUser() {
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

    it('deve adicionar um template por URL do Drive com sucesso', async () => {
        const certificateEmission = createCertificateEmission()

        const certificateEmissionsRepositoryMock: Pick<
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

        class GoogleDriveGatewayStub
            implements
                Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
        {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'filename',
                    fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
                    thumbnailUrl: null,
                }
            }

            async downloadFile(): Promise<Buffer> {
                return Buffer.from('file content')
            }
        }

        class FileContentExtractorFactoryStub
            implements Pick<IFileContentExtractorFactory, 'create'>
        {
            create(): IFileContentExtractorStrategy {
                return {
                    async extractText(): Promise<string> {
                        return '{{name}} {{email}}'
                    },
                }
            }
        }

        class BucketStub implements Pick<IBucket, 'uploadObject'> {
            async uploadObject(): Promise<string> {
                return ''
            }
        }

        class TransactionManagerStub
            implements Pick<ITransactionManager, 'run'>
        {
            async run<T>(work: () => Promise<T>): Promise<T> {
                return work()
            }
        }

        class UsersRepositoryStub implements Pick<IUsersRepository, 'getById'> {
            async getById(): Promise<User | null> {
                return createUser()
            }
        }

        const stringVariableExtractorStub: Pick<
            IStringVariableExtractor,
            'extractVariables'
        > = {
            extractVariables: () => ['name', 'email'],
        }

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepositoryMock,
            dataSourceRowsRepositoryStub,
            new GoogleDriveGatewayStub(),
            new FileContentExtractorFactoryStub(),
            new BucketStub(),
            new TransactionManagerStub(),
            stringVariableExtractorStub,
            new UsersRepositoryStub(),
        )

        await addTemplateByUrlUseCase.execute({
            certificateId: CERTIFICATE_ID,
            fileUrl: VALID_DRIVE_URL,
            userId: USER_ID,
        })

        expect(certificateEmissionsRepositoryMock.update).toHaveBeenCalledWith(
            certificateEmission,
        )
        expect(certificateEmission.hasTemplate()).toBe(true)
    })

    it('deve resetar o status de processamento das linhas da fonte de dados ao adicionar o template quando houver fonte de dados vinculada', async () => {
        const certificateEmission = createCertificateEmission({
            dataSource: createDataSource(),
        })

        const certificateEmissionsRepositoryMock: Pick<
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

        class GoogleDriveGatewayStub
            implements
                Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
        {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'filename',
                    fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
                    thumbnailUrl: null,
                }
            }

            async downloadFile(): Promise<Buffer> {
                return Buffer.from('')
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

        class BucketStub implements Pick<IBucket, 'uploadObject'> {
            async uploadObject(): Promise<string> {
                return ''
            }
        }

        class TransactionManagerStub
            implements Pick<ITransactionManager, 'run'>
        {
            async run<T>(work: () => Promise<T>): Promise<T> {
                return work()
            }
        }

        class UsersRepositoryStub implements Pick<IUsersRepository, 'getById'> {
            async getById(): Promise<User | null> {
                return createUser()
            }
        }

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepositoryMock,
            dataSourceRowsRepositoryStub,
            new GoogleDriveGatewayStub(),
            new FileContentExtractorFactoryStub(),
            new BucketStub(),
            new TransactionManagerStub(),
            { extractVariables: () => [] },
            new UsersRepositoryStub(),
        )

        await addTemplateByUrlUseCase.execute({
            certificateId: CERTIFICATE_ID,
            fileUrl: VALID_DRIVE_URL,
            userId: USER_ID,
        })

        expect(
            dataSourceRowsRepositoryStub.resetProcessingStatusByCertificateEmissionId,
        ).toHaveBeenCalledWith(CERTIFICATE_ID)
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        const certificateEmissionsRepositoryMock: Pick<
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

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as IFileContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            {} as IStringVariableExtractor,
            {} as IUsersRepository,
        )

        await expect(
            addTemplateByUrlUseCase.execute({
                certificateId: CERTIFICATE_ID,
                fileUrl: VALID_DRIVE_URL,
                userId: USER_ID,
            }),
        ).rejects.toThrow(NotCertificateOwnerError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado já tiver sido emitida', async () => {
        const certificateEmissionsRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(
                createCertificateEmission({
                    status: CERTIFICATE_STATUS.EMITTED,
                }),
            ),
            update: vi.fn(),
        }

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as IFileContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            {} as IStringVariableExtractor,
            {} as IUsersRepository,
        )

        await expect(
            addTemplateByUrlUseCase.execute({
                certificateId: CERTIFICATE_ID,
                fileUrl: VALID_DRIVE_URL,
                userId: USER_ID,
            }),
        ).rejects.toThrow(CertificateEmittedError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        const certificateEmissionsRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as IFileContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            {} as IStringVariableExtractor,
            {} as IUsersRepository,
        )

        await expect(
            addTemplateByUrlUseCase.execute({
                certificateId: 'nao-existe',
                fileUrl: VALID_DRIVE_URL,
                userId: USER_ID,
            }),
        ).rejects.toThrow(CertificateNotFoundError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando não for possível extrair o ID de arquivo do Drive a partir da URL', async () => {
        const certificateEmissionsRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as IFileContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            {} as IStringVariableExtractor,
            {} as IUsersRepository,
        )

        await expect(
            addTemplateByUrlUseCase.execute({
                certificateId: CERTIFICATE_ID,
                fileUrl: 'https://url-invalida.com',
                userId: USER_ID,
            }),
        ).rejects.toThrow(UnexistentTemplateDriveFileIdError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o formato do arquivo não for suportado como template', async () => {
        const certificateEmissionsRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        class GoogleDriveGatewayStub
            implements
                Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
        {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'filename',
                    fileMimeType: 'application/pdf',
                    thumbnailUrl: null,
                }
            }

            async downloadFile(): Promise<Buffer> {
                return Buffer.from('')
            }
        }

        class UsersRepositoryStub implements Pick<IUsersRepository, 'getById'> {
            async getById(): Promise<User | null> {
                return createUser()
            }
        }

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepositoryMock,
            {} as IDataSourceRowsRepository,
            new GoogleDriveGatewayStub(),
            {} as IFileContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            {} as IStringVariableExtractor,
            new UsersRepositoryStub(),
        )

        await expect(
            addTemplateByUrlUseCase.execute({
                certificateId: CERTIFICATE_ID,
                fileUrl: VALID_DRIVE_URL,
                userId: USER_ID,
            }),
        ).rejects.toThrow(UnsupportedTemplateMimetypeError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })
})