import { beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { AddTemplateByUrlUseCase } from './add-template-by-url-use-case'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IStringVariableExtractor } from './interfaces/extraction/istring-variable-extractor'
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
} from './interfaces/gateway/igoogle-drive-gateway'
import { TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import {
    IFileContentExtractorStrategy,
    IFileContentExtractorFactory,
} from './interfaces/extraction/ifile-content-extractor-factory'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { UnexistentTemplateDriveFileIdError } from '../domain/error/validation-error/unexistent-template-drive-file-id-error'
import { UnsupportedTemplateMimetypeError } from '../domain/error/validation-error/unsupported-template-mimetype-error'
import { IBucket } from './interfaces/storage/ibucket'

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

    let certificateEmissionsRepositoryMock: {
        getById: Mock<ICertificatesRepository['getById']>
        update: Mock<ICertificatesRepository['update']>
    }

    let googleDriveGatewayStub: Pick<
        IGoogleDriveGateway,
        'getFileMetadata' | 'downloadFile'
    >

    let fileContentExtractorFactoryStub: Pick<
        IFileContentExtractorFactory,
        'create'
    >

    let bucketStub: Pick<IBucket, 'uploadObject'>

    let transactionManagerStub: Pick<ITransactionManager, 'run'>

    let usersRepositoryStub: Pick<IUsersRepository, 'getById'>

    let dataSourceRowsRepositoryStub: Pick<
        IDataSourceRowsRepository,
        'resetProcessingStatusByCertificateEmissionId'
    >

    beforeEach(() => {
        certificateEmissionsRepositoryMock = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        googleDriveGatewayStub = {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'filename',
                    fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
                    thumbnailUrl: null,
                }
            },
            async downloadFile(): Promise<Buffer> {
                return Buffer.from('file content')
            },
        }

        fileContentExtractorFactoryStub = {
            create(): IFileContentExtractorStrategy {
                return {
                    async extractText(): Promise<string> {
                        return '{{name}} {{email}}'
                    },
                }
            },
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

        usersRepositoryStub = {
            async getById(): Promise<User | null> {
                return createUser()
            },
        }

        dataSourceRowsRepositoryStub = {
            async resetProcessingStatusByCertificateEmissionId() {},
        }
    })

    it('deve adicionar um template por URL do Drive com sucesso', async () => {
        const certificateEmission = createCertificateEmission()
        certificateEmissionsRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepositoryMock,
            dataSourceRowsRepositoryStub,
            googleDriveGatewayStub,
            fileContentExtractorFactoryStub,
            bucketStub,
            transactionManagerStub,
            { extractVariables: () => ['name', 'email'] },
            usersRepositoryStub,
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
        certificateEmissionsRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const dataSourceRowsRepositoryMock: {
            resetProcessingStatusByCertificateEmissionId: Mock<
                IDataSourceRowsRepository['resetProcessingStatusByCertificateEmissionId']
            >
        } = {
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepositoryMock,
            dataSourceRowsRepositoryMock,
            googleDriveGatewayStub,
            fileContentExtractorFactoryStub,
            bucketStub,
            transactionManagerStub,
            { extractVariables: () => [] },
            usersRepositoryStub,
        )

        await addTemplateByUrlUseCase.execute({
            certificateId: CERTIFICATE_ID,
            fileUrl: VALID_DRIVE_URL,
            userId: USER_ID,
        })

        expect(
            dataSourceRowsRepositoryMock.resetProcessingStatusByCertificateEmissionId,
        ).toHaveBeenCalledWith(CERTIFICATE_ID)
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        certificateEmissionsRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ userId: 'outro-usuario' }),
        )

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
        certificateEmissionsRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED }),
        )

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
        certificateEmissionsRepositoryMock.getById.mockResolvedValue(null)

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
        googleDriveGatewayStub.getFileMetadata = async () => ({
            name: 'filename',
            fileMimeType: 'application/pdf',
            thumbnailUrl: null,
        })

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepositoryMock,
            {} as IDataSourceRowsRepository,
            googleDriveGatewayStub,
            {} as IFileContentExtractorFactory,
            {} as IBucket,
            {} as ITransactionManager,
            {} as IStringVariableExtractor,
            usersRepositoryStub,
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
