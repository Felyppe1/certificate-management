import { describe, expect, it, vi } from 'vitest'
import { AddTemplateByUrlUseCase } from './add-template-by-url-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IStringVariableExtractor } from './interfaces/istring-variable-extractor'
import { CertificateEmission, CERTIFICATE_STATUS } from '../domain/certificate'
import { User } from '../domain/user'
import {
    GetFileMetadataOutput,
    IGoogleDriveGateway,
} from './interfaces/igoogle-drive-gateway'
import { TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import {
    IFileContentExtractorStrategy,
    IFileContentExtractorFactory,
} from './interfaces/ifile-content-extractor-factory'
import { ForbiddenError } from '../domain/error/forbidden-error'
import { NotFoundError } from '../domain/error/not-found-error'
import { ValidationError } from '../domain/error/validation-error'
import { IBucket } from './interfaces/cloud/ibucket'

describe('AddTemplateByUrlUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'
    const VALID_DRIVE_URL = 'https://drive.google.com/file/d/abc123/view'

    function createCertificateEmission(overrides?: {
        userId?: string
        status?: CERTIFICATE_STATUS
    }) {
        return new CertificateEmission({
            id: CERTIFICATE_ID,
            name: 'Name',
            userId: overrides?.userId ?? USER_ID,
            template: null,
            createdAt: new Date(),
            status: overrides?.status ?? CERTIFICATE_STATUS.DRAFT,
            dataSource: null,
            variableColumnMapping: null,
        })
    }

    function createUser() {
        return new User({
            id: USER_ID,
            email: 'user@test.com',
            name: 'User',
            passwordHash: null,
            credits: 300,
            externalAccounts: [
                {
                    provider: 'GOOGLE',
                    providerUserId: 'google-user-id',
                    accessToken: 'access-token',
                    refreshToken: 'refresh-token',
                    accessTokenExpiryDateTime: new Date(Date.now() + 3_600_000),
                    refreshTokenExpiryDateTime: null,
                },
            ],
        })
    }

    it('should add a template by URL successfully', async () => {
        const certificateEmissionsRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
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

        await expect(
            addTemplateByUrlUseCase.execute({
                certificateId: CERTIFICATE_ID,
                fileUrl: VALID_DRIVE_URL,
                userId: USER_ID,
            }),
        ).resolves.not.toThrow()

        expect(certificateEmissionsRepositoryMock.getById).toHaveBeenCalledWith(
            CERTIFICATE_ID,
        )

        const updateMock =
            certificateEmissionsRepositoryMock.update as ReturnType<
                typeof vi.fn
            >
        const updatedCertificate = updateMock.mock
            .calls[0][0] as CertificateEmission
        expect(updatedCertificate.hasTemplate()).toBe(true)
    })

    it('should not add a template when the user is not the certificate owner', async () => {
        const certificateEmissionsRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi
                .fn()
                .mockResolvedValue(
                    createCertificateEmission({ userId: 'other-user-id' }),
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
        ).rejects.toThrow(ForbiddenError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('should not add a template when the certificate has already been emitted', async () => {
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
        ).rejects.toThrow(ValidationError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('should throw a not found error when certificate is not found', async () => {
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
                certificateId: 'non-existent-id',
                fileUrl: VALID_DRIVE_URL,
                userId: USER_ID,
            }),
        ).rejects.toThrow(NotFoundError)

        expect(certificateEmissionsRepositoryMock.getById).toHaveBeenCalledWith(
            'non-existent-id',
        )
        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('should throw a validation error when cannot get the file id from the url', async () => {
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
                fileUrl: 'https://invalid-url.com',
                userId: USER_ID,
            }),
        ).rejects.toThrow(ValidationError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('should not add a template when the file format is not supported', async () => {
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
        ).rejects.toThrow(ValidationError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })
})
