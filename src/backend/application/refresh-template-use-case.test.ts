import { beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { RefreshTemplateUseCase } from './refresh-template-use-case'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IStringVariableExtractor } from './interfaces/extraction/istring-variable-extractor'
import { IBucket } from './interfaces/storage/ibucket'
import {
    GetFileMetadataOutput,
    IGoogleDriveGateway,
} from './interfaces/gateway/igoogle-drive-gateway'
import {
    CheckOrRefreshAccessTokenOuput,
    IGoogleAuthGateway,
} from './interfaces/gateway/igoogle-auth-gateway'
import {
    IFileContentExtractorFactory,
    IFileContentExtractorStrategy,
} from './interfaces/extraction/ifile-content-extractor-factory'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { Template, TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { User } from '../domain/user'
import { ExternalAccount } from '../domain/external-account'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { TemplateNotFoundError } from '../domain/error/not-found-error/template-not-found-error'
import { UnexistentTemplateDriveFileIdError } from '../domain/error/validation-error/unexistent-template-drive-file-id-error'
import { UnsupportedTemplateMimetypeError } from '../domain/error/validation-error/unsupported-template-mimetype-error'

describe('RefreshTemplateUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'
    const DRIVE_FILE_ID = 'drive-file-id-123'

    function createTemplate(overrides?: { driveFileId?: string | null }) {
        return new Template({
            driveFileId:
                overrides?.driveFileId !== undefined
                    ? overrides.driveFileId
                    : DRIVE_FILE_ID,
            storageFileUrl: `users/${USER_ID}/certificates/${CERTIFICATE_ID}/template.pptx`,
            inputMethod: INPUT_METHOD.GOOGLE_DRIVE,
            fileName: 'template.pptx',
            fileMimeType: TEMPLATE_FILE_MIME_TYPE.PPTX,
            thumbnailUrl: null,
            variables: [],
            googleAccountEmail: null,
        })
    }

    function createCertificateEmission(overrides?: {
        userId?: string
        status?: CERTIFICATE_STATUS
        template?: Template | null
        dataSource?: DataSource | null
    }) {
        return new CertificateEmission({
            id: CERTIFICATE_ID,
            name: 'Certificado',
            userId: overrides?.userId ?? USER_ID,
            template:
                overrides?.template !== undefined
                    ? overrides.template
                    : createTemplate(),
            createdAt: new Date(),
            status: overrides?.status ?? CERTIFICATE_STATUS.DRAFT,
            dataSource: overrides?.dataSource ?? null,
            variableColumnMapping: null,
        })
    }

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
            columns: [
                { name: 'Nome', type: 'string' as const, arrayMetadata: null },
            ],
            googleAccountEmail: null,
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

    let certificatesRepositoryMock: {
        getById: Mock<ICertificatesRepository['getById']>
        update: Mock<ICertificatesRepository['update']>
    }

    let dataSourceRowsRepositoryStub: Pick<
        IDataSourceRowsRepository,
        'resetProcessingStatusByCertificateEmissionId'
    >

    let googleDriveGatewayStub: Pick<
        IGoogleDriveGateway,
        'getFileMetadata' | 'downloadFile'
    >

    let googleAuthGatewayStub: Pick<
        IGoogleAuthGateway,
        'checkOrGetNewAccessToken'
    >

    let fileContentExtractorFactoryStub: Pick<
        IFileContentExtractorFactory,
        'create'
    >

    let usersRepositoryStub: Pick<IUsersRepository, 'getById' | 'update'>

    let bucketStub: Pick<IBucket, 'uploadObject'>

    let transactionManagerStub: Pick<ITransactionManager, 'run'>

    beforeEach(() => {
        certificatesRepositoryMock = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        dataSourceRowsRepositoryStub = {
            async resetProcessingStatusByCertificateEmissionId() {},
        }

        googleDriveGatewayStub = {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'template.pptx',
                    fileMimeType: TEMPLATE_FILE_MIME_TYPE.PPTX,
                    thumbnailUrl: null,
                }
            },
            async downloadFile(): Promise<Buffer> {
                return Buffer.from('file content')
            },
        }

        googleAuthGatewayStub = {
            async checkOrGetNewAccessToken(): Promise<CheckOrRefreshAccessTokenOuput | null> {
                return null
            },
        }

        fileContentExtractorFactoryStub = {
            create(): IFileContentExtractorStrategy {
                return {
                    async extractText(): Promise<string> {
                        return '{{nome}}'
                    },
                }
            },
        }

        usersRepositoryStub = {
            async getById(): Promise<User | null> {
                return null
            },
            async update(): Promise<void> {},
        }

        bucketStub = {
            async uploadObject(): Promise<string> {
                return ''
            },
        }

        transactionManagerStub = {
            async run<T>(work: () => Promise<T>): Promise<T> {
                return work()
            },
        }
    })

    it('deve atualizar o template com sucesso sem conta Google', async () => {
        const certificateEmission = createCertificateEmission()
        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const useCase = new RefreshTemplateUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            googleDriveGatewayStub,
            googleAuthGatewayStub,
            fileContentExtractorFactoryStub,
            usersRepositoryStub,
            transactionManagerStub,
            bucketStub,
            { extractVariables: () => ['nome'] },
        )

        await useCase.execute({
            userId: USER_ID,
            certificateId: CERTIFICATE_ID,
        })

        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(
            certificateEmission,
        )
        expect(certificateEmission.hasTemplate()).toBe(true)
    })

    it('deve atualizar o template com sucesso com conta Google quando o token ainda é válido', async () => {
        const certificateEmission = createCertificateEmission()
        const user = createUser()

        const usersRepositoryMock: {
            getById: Mock<IUsersRepository['getById']>
            update: Mock<IUsersRepository['update']>
        } = {
            getById: vi.fn().mockResolvedValue(user),
            update: vi.fn(),
        }

        const googleAuthGatewayMock: {
            checkOrGetNewAccessToken: Mock<
                IGoogleAuthGateway['checkOrGetNewAccessToken']
            >
        } = {
            checkOrGetNewAccessToken: vi.fn().mockResolvedValue(null),
        }

        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const useCase = new RefreshTemplateUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            googleDriveGatewayStub,
            googleAuthGatewayMock,
            fileContentExtractorFactoryStub,
            usersRepositoryMock,
            transactionManagerStub,
            bucketStub,
            { extractVariables: () => [] },
        )

        await useCase.execute({
            userId: USER_ID,
            certificateId: CERTIFICATE_ID,
        })

        expect(
            googleAuthGatewayMock.checkOrGetNewAccessToken,
        ).toHaveBeenCalled()
        expect(usersRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve renovar o token Google e persistir o usuário quando o token estiver expirado', async () => {
        const certificateEmission = createCertificateEmission()
        const user = createUser()

        const usersRepositoryMock: {
            getById: Mock<IUsersRepository['getById']>
            update: Mock<IUsersRepository['update']>
        } = {
            getById: vi.fn().mockResolvedValue(user),
            update: vi.fn(),
        }

        const newAccessToken = 'new-access-token'
        const newExpiry = new Date(Date.now() + 7_200_000)

        const googleAuthGatewayMock: {
            checkOrGetNewAccessToken: Mock<
                IGoogleAuthGateway['checkOrGetNewAccessToken']
            >
        } = {
            checkOrGetNewAccessToken: vi.fn().mockResolvedValue({
                newAccessToken,
                newAccessTokenExpiryDateTime: newExpiry,
            }),
        }

        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const useCase = new RefreshTemplateUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            googleDriveGatewayStub,
            googleAuthGatewayMock,
            fileContentExtractorFactoryStub,
            usersRepositoryMock,
            transactionManagerStub,
            bucketStub,
            { extractVariables: () => [] },
        )

        await useCase.execute({
            userId: USER_ID,
            certificateId: CERTIFICATE_ID,
        })

        expect(usersRepositoryMock.update).toHaveBeenCalledWith(user)
    })

    it('deve resetar o status de processamento das linhas quando houver fonte de dados', async () => {
        const certificateEmission = createCertificateEmission({
            dataSource: createDataSource(),
        })
        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const dataSourceRowsRepositoryMock: {
            resetProcessingStatusByCertificateEmissionId: Mock<
                IDataSourceRowsRepository['resetProcessingStatusByCertificateEmissionId']
            >
        } = {
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }

        const useCase = new RefreshTemplateUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryMock,
            googleDriveGatewayStub,
            googleAuthGatewayStub,
            fileContentExtractorFactoryStub,
            usersRepositoryStub,
            transactionManagerStub,
            bucketStub,
            { extractVariables: () => [] },
        )

        await useCase.execute({
            userId: USER_ID,
            certificateId: CERTIFICATE_ID,
        })

        expect(
            dataSourceRowsRepositoryMock.resetProcessingStatusByCertificateEmissionId,
        ).toHaveBeenCalledWith(CERTIFICATE_ID)
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(null)

        const useCase = new RefreshTemplateUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as IGoogleAuthGateway,
            {} as IFileContentExtractorFactory,
            {} as IUsersRepository,
            {} as ITransactionManager,
            {} as IBucket,
            {} as IStringVariableExtractor,
        )

        await expect(
            useCase.execute({ userId: USER_ID, certificateId: 'nao-existe' }),
        ).rejects.toThrow(CertificateNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ userId: 'outro-usuario' }),
        )

        const useCase = new RefreshTemplateUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as IGoogleAuthGateway,
            {} as IFileContentExtractorFactory,
            {} as IUsersRepository,
            {} as ITransactionManager,
            {} as IBucket,
            {} as IStringVariableExtractor,
        )

        await expect(
            useCase.execute({ userId: USER_ID, certificateId: CERTIFICATE_ID }),
        ).rejects.toThrow(NotCertificateOwnerError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado já tiver sido emitida', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED }),
        )

        const useCase = new RefreshTemplateUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as IGoogleAuthGateway,
            {} as IFileContentExtractorFactory,
            {} as IUsersRepository,
            {} as ITransactionManager,
            {} as IBucket,
            {} as IStringVariableExtractor,
        )

        await expect(
            useCase.execute({ userId: USER_ID, certificateId: CERTIFICATE_ID }),
        ).rejects.toThrow(CertificateEmittedError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o certificado não tiver template', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ template: null }),
        )

        const useCase = new RefreshTemplateUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as IGoogleAuthGateway,
            {} as IFileContentExtractorFactory,
            {} as IUsersRepository,
            {} as ITransactionManager,
            {} as IBucket,
            {} as IStringVariableExtractor,
        )

        await expect(
            useCase.execute({ userId: USER_ID, certificateId: CERTIFICATE_ID }),
        ).rejects.toThrow(TemplateNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o template não tiver driveFileId', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({
                template: createTemplate({ driveFileId: null }),
            }),
        )

        const useCase = new RefreshTemplateUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as IGoogleAuthGateway,
            {} as IFileContentExtractorFactory,
            {} as IUsersRepository,
            {} as ITransactionManager,
            {} as IBucket,
            {} as IStringVariableExtractor,
        )

        await expect(
            useCase.execute({ userId: USER_ID, certificateId: CERTIFICATE_ID }),
        ).rejects.toThrow(UnexistentTemplateDriveFileIdError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o mimetype do arquivo no Drive não for suportado', async () => {
        const invalidMimeTypeGatewayStub: Pick<
            IGoogleDriveGateway,
            'getFileMetadata' | 'downloadFile'
        > = {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'arquivo.png',
                    fileMimeType: 'image/png' as TEMPLATE_FILE_MIME_TYPE,
                    thumbnailUrl: null,
                }
            },
            async downloadFile(): Promise<Buffer> {
                return Buffer.from('')
            },
        }

        const useCase = new RefreshTemplateUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            invalidMimeTypeGatewayStub,
            googleAuthGatewayStub,
            {} as IFileContentExtractorFactory,
            usersRepositoryStub,
            {} as ITransactionManager,
            {} as IBucket,
            {} as IStringVariableExtractor,
        )

        await expect(
            useCase.execute({ userId: USER_ID, certificateId: CERTIFICATE_ID }),
        ).rejects.toThrow(UnsupportedTemplateMimetypeError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })
})
