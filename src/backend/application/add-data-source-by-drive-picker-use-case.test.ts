import { describe, expect, it, vi } from 'vitest'
import { AddDataSourceByDrivePickerUseCase } from './add-data-source-by-drive-picker-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { IGoogleDriveGateway, GetFileMetadataOutput } from './interfaces/igoogle-drive-gateway'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IBucket } from './interfaces/cloud/ibucket'
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
            columns: [{ name: 'Imagem', type: 'string' as const, arrayMetadata: null }],
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

    class GoogleDriveGatewayStub
        implements
            Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
    {
        async getFileMetadata(): Promise<GetFileMetadataOutput> {
            return {
                name: 'dados.csv',
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
                        rows: [{ Nome: 'João' }],
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

    it('deve adicionar uma fonte de dados via Drive Picker com sucesso', async () => {
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
                return createUser()
            }
            async update(): Promise<void> {}
        }

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            new GoogleDriveGatewayStub(),
            new SpreadsheetContentExtractorFactoryStub(),
            new UsersRepositoryStub(),
            new GoogleAuthGatewayStub(),
            { async deleteObject() {} } as Pick<IBucket, 'deleteObject'>,
            new TransactionManagerStub(),
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
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

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

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as ISpreadsheetContentExtractorFactory,
            new UsersRepositoryStub(),
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

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IGoogleDriveGateway,
            {} as ISpreadsheetContentExtractorFactory,
            new UsersRepositoryStub(),
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
                return createUser()
            }
            async update(): Promise<void> {}
        }

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            new PdfDriveGatewayStub(),
            {} as ISpreadsheetContentExtractorFactory,
            new UsersRepositoryStub(),
            new GoogleAuthGatewayStub(),
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
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        const dataSourceRowsRepositoryStub: Pick<
            IDataSourceRowsRepository,
            'saveMany' | 'deleteManyByCertificateEmissionId'
        > = {
            saveMany: vi.fn(),
            deleteManyByCertificateEmissionId: vi.fn(),
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

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            new GoogleDriveGatewayStub(),
            new SpreadsheetContentExtractorFactoryStub(),
            usersRepositoryMock,
            googleAuthGatewayMock,
            { async deleteObject() {} } as Pick<IBucket, 'deleteObject'>,
            new TransactionManagerStub(),
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            fileIds: [FILE_ID],
            userId: USER_ID,
        })

        expect(usersRepositoryMock.update).toHaveBeenCalled()
    })

    it('deve lançar erro quando o número de imagens ultrapassar o limite permitido', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
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
                return createUser()
            }
            async update(): Promise<void> {}
        }

        const fiveImageIds = Array.from({ length: 5 }, (_, i) => image-id-${i})

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            new ImageDriveGatewayStub(),
            {} as ISpreadsheetContentExtractorFactory,
            new UsersRepositoryStub(),
            new GoogleAuthGatewayStub(),
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

        let callCount = 0
        class MixedDriveGatewayStub
            implements
                Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
        {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'file',
                    fileMimeType:
                        callCount++ === 0
                            ? DATA_SOURCE_MIME_TYPE.PNG
                            : DATA_SOURCE_MIME_TYPE.CSV,
                    thumbnailUrl: null,
                }
            }
            async downloadFile(): Promise<Buffer> {
                return Buffer.from('')
            }
        }

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            new MixedDriveGatewayStub(),
            {} as ISpreadsheetContentExtractorFactory,
            new UsersRepositoryStub(),
            new GoogleAuthGatewayStub(),
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

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            new GoogleDriveGatewayStub(),
            {} as ISpreadsheetContentExtractorFactory,
            new UsersRepositoryStub(),
            new GoogleAuthGatewayStub(),
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
                return createUser()
            }
            async update(): Promise<void> {}
        }

        const bucketMock: Pick<IBucket, 'deleteObject'> = {
            deleteObject: vi.fn(),
        }

        const useCase = new AddDataSourceByDrivePickerUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            new GoogleDriveGatewayStub(),
            new SpreadsheetContentExtractorFactoryStub(),
            new UsersRepositoryStub(),
            new GoogleAuthGatewayStub(),
            bucketMock,
            new TransactionManagerStub(),
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            fileIds: [FILE_ID],
            userId: USER_ID,
        })

        expect(bucketMock.deleteObject).toHaveBeenCalled()
    })
})