import { beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { TurnDataSourceIntoSpreadsheetUseCase } from './turn-data-source-into-spreadsheet-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsReadRepository } from './interfaces/repository/idata-source-rows-read-repository'
import { IBucket } from './interfaces/cloud/ibucket'
import {
    ISpreadsheetGeneratorFactory,
    ISpreadsheetContentExtractorStrategy,
} from './interfaces/ispreadsheet-content-extractor-factory'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
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
import { DataSourceNotImageError } from '../domain/error/validation-error/data-source-not-image-error'
import { GoogleAccountNotFoundError } from '../domain/error/forbidden-error/google-account-not-found-error'

describe('TurnDataSourceIntoSpreadsheetUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'

    function createDataSourceImage() {
        return new DataSource({
            files: [
                {
                    fileName: 'foto.png',
                    storageFileUrl: 'https://storage/foto.png',
                    driveFileId: null,
                },
            ],
            inputMethod: INPUT_METHOD.UPLOAD,
            fileMimeType: DATA_SOURCE_MIME_TYPE.PNG,
            thumbnailUrl: null,
            columnsRow: 1,
            dataRowStart: 2,
            columns: [
                { name: 'Nome', type: 'string' as const, arrayMetadata: null },
            ],
            googleAccountEmail: null,
        })
    }

    function createDataSourceCsv() {
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
            name: 'Certificado',
            userId: overrides?.userId ?? USER_ID,
            template: null,
            createdAt: new Date(),
            status: overrides?.status ?? CERTIFICATE_STATUS.DRAFT,
            dataSource:
                overrides?.dataSource !== undefined
                    ? overrides.dataSource
                    : createDataSourceImage(),
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

    let dataSourceRowsReadRepositoryStub: Pick<
        IDataSourceRowsReadRepository,
        'getAllRawByCertificateEmissionId'
    >

    let spreadsheetGeneratorFactoryStub: Pick<
        ISpreadsheetGeneratorFactory,
        'create'
    >

    let bucketStub: Pick<IBucket, 'uploadObject' | 'deleteObject'>

    let googleAuthGatewayStub: Pick<
        IGoogleAuthGateway,
        'checkOrGetNewAccessToken'
    >

    let googleDriveGatewayStub: Pick<IGoogleDriveGateway, 'uploadFile'>

    let usersRepositoryStub: Pick<IUsersRepository, 'getById' | 'update'>

    beforeEach(() => {
        certificatesRepositoryMock = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        dataSourceRowsReadRepositoryStub = {
            async getAllRawByCertificateEmissionId() {
                return [{ id: 'row-1', data: { Nome: 'João' } }]
            },
        }

        spreadsheetGeneratorFactoryStub = {
            create(): ISpreadsheetContentExtractorStrategy {
                return {
                    async extractColumns() {
                        return { columns: [], rows: [] }
                    },
                    async generate(): Promise<Buffer> {
                        return Buffer.from('spreadsheet-content')
                    },
                }
            },
        }

        bucketStub = {
            async uploadObject(): Promise<string> {
                return ''
            },
            async deleteObject(): Promise<void> {},
        }

        googleAuthGatewayStub = {
            async checkOrGetNewAccessToken() {
                return null
            },
        }

        googleDriveGatewayStub = {
            async uploadFile() {
                return { fileId: 'new-drive-file-id', webViewLink: '' }
            },
        }

        usersRepositoryStub = {
            async getById(): Promise<User | null> {
                return createUser()
            },
            async update(): Promise<void> {},
        }
    })

    it('deve converter fonte de dados de imagens para planilha com destino local com sucesso', async () => {
        const certificateEmission = createCertificateEmission()
        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const useCase = new TurnDataSourceIntoSpreadsheetUseCase(
            certificatesRepositoryMock,
            dataSourceRowsReadRepositoryStub,
            bucketStub,
            spreadsheetGeneratorFactoryStub,
            {} as IGoogleDriveGateway,
            {} as IUsersRepository,
            {} as IGoogleAuthGateway,
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
            format: 'csv',
            destination: 'local',
        })

        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(
            certificateEmission,
        )
        expect(certificateEmission.hasDataSource()).toBe(true)
    })

    it('deve converter fonte de dados de imagens para planilha com destino Drive com sucesso', async () => {
        const certificateEmission = createCertificateEmission()
        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const useCase = new TurnDataSourceIntoSpreadsheetUseCase(
            certificatesRepositoryMock,
            dataSourceRowsReadRepositoryStub,
            bucketStub,
            spreadsheetGeneratorFactoryStub,
            googleDriveGatewayStub,
            usersRepositoryStub,
            googleAuthGatewayStub,
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
            format: 'xlsx',
            destination: 'drive',
        })

        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(
            certificateEmission,
        )
        expect(certificateEmission.hasDataSource()).toBe(true)
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(null)

        const useCase = new TurnDataSourceIntoSpreadsheetUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsReadRepository,
            {} as IBucket,
            {} as ISpreadsheetGeneratorFactory,
            {} as IGoogleDriveGateway,
            {} as IUsersRepository,
            {} as IGoogleAuthGateway,
        )

        await expect(
            useCase.execute({
                certificateId: 'nao-existe',
                userId: USER_ID,
                format: 'csv',
                destination: 'local',
            }),
        ).rejects.toThrow(CertificateNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ userId: 'outro-usuario' }),
        )

        const useCase = new TurnDataSourceIntoSpreadsheetUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsReadRepository,
            {} as IBucket,
            {} as ISpreadsheetGeneratorFactory,
            {} as IGoogleDriveGateway,
            {} as IUsersRepository,
            {} as IGoogleAuthGateway,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
                format: 'csv',
                destination: 'local',
            }),
        ).rejects.toThrow(NotCertificateOwnerError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado já tiver sido emitida', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED }),
        )

        const useCase = new TurnDataSourceIntoSpreadsheetUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsReadRepository,
            {} as IBucket,
            {} as ISpreadsheetGeneratorFactory,
            {} as IGoogleDriveGateway,
            {} as IUsersRepository,
            {} as IGoogleAuthGateway,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
                format: 'csv',
                destination: 'local',
            }),
        ).rejects.toThrow(CertificateEmittedError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando não houver fonte de dados vinculada', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ dataSource: null }),
        )

        const useCase = new TurnDataSourceIntoSpreadsheetUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsReadRepository,
            {} as IBucket,
            {} as ISpreadsheetGeneratorFactory,
            {} as IGoogleDriveGateway,
            {} as IUsersRepository,
            {} as IGoogleAuthGateway,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
                format: 'csv',
                destination: 'local',
            }),
        ).rejects.toThrow(DataSourceNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a fonte de dados não for do tipo imagem', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ dataSource: createDataSourceCsv() }),
        )

        const useCase = new TurnDataSourceIntoSpreadsheetUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsReadRepository,
            {} as IBucket,
            {} as ISpreadsheetGeneratorFactory,
            {} as IGoogleDriveGateway,
            {} as IUsersRepository,
            {} as IGoogleAuthGateway,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
                format: 'csv',
                destination: 'local',
            }),
        ).rejects.toThrow(DataSourceNotImageError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o destino for Drive e o usuário não tiver conta Google vinculada', async () => {
        const usersRepositoryWithoutGoogleStub: Pick<
            IUsersRepository,
            'getById' | 'update'
        > = {
            async getById(): Promise<User | null> {
                return createUser(false)
            },
            async update(): Promise<void> {},
        }

        const useCase = new TurnDataSourceIntoSpreadsheetUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsReadRepository,
            {} as IBucket,
            {} as ISpreadsheetGeneratorFactory,
            {} as IGoogleDriveGateway,
            usersRepositoryWithoutGoogleStub,
            {} as IGoogleAuthGateway,
        )

        await expect(
            useCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
                format: 'csv',
                destination: 'drive',
            }),
        ).rejects.toThrow(GoogleAccountNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve atualizar os tokens do usuário quando o token do Google precisar ser renovado ao exportar para o Drive', async () => {
        const certificateEmission = createCertificateEmission()
        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

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

        const useCase = new TurnDataSourceIntoSpreadsheetUseCase(
            certificatesRepositoryMock,
            dataSourceRowsReadRepositoryStub,
            bucketStub,
            spreadsheetGeneratorFactoryStub,
            googleDriveGatewayStub,
            usersRepositoryMock,
            googleAuthGatewayMock,
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
            format: 'xlsx',
            destination: 'drive',
        })

        expect(usersRepositoryMock.update).toHaveBeenCalled()
    })
})
