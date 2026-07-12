import { describe, expect, it } from 'vitest'
import { CERTIFICATE_STATUS } from '../domain/certificate'
import { DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import {
    GetFileMetadataOutput,
    IGoogleDriveGateway,
} from './interfaces/gateway/igoogle-drive-gateway'
import {
    CheckOrRefreshAccessTokenOuput,
    IGoogleAuthGateway,
} from './interfaces/gateway/igoogle-auth-gateway'
import {
    ExtractColumns,
    ISpreadsheetContentExtractorFactory,
    ISpreadsheetContentExtractorStrategy,
} from './interfaces/extraction/ispreadsheet-content-extractor-factory'
import { IBucket } from './interfaces/storage/ibucket'
import { PrismaCertificatesRepository } from '../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '../interface-adapters/repository/prisma/prisma-transaction-manager'
import { PrismaUsersRepository } from '../interface-adapters/repository/prisma/write/prisma-users-repository'
import { AddDataSourceByDrivePickerUseCase } from './add-data-source-by-drive-picker-use-case'
import { prisma } from '@/tests/setup.integration'

describe('AddDataSourceByDrivePickerUseCase (Integration)', () => {
    it('deve criar fonte de dados a partir do Google Drive com linhas e valores persistidos', async () => {
        await prisma.user.create({
            data: {
                id: '1',
                email: 'user@gmail.com',
                password_hash: 'password',
                name: 'User',
            },
        })

        await prisma.externalUserAccount.create({
            data: {
                user_id: '1',
                provider: 'GOOGLE',
                provider_user_id: 'google-user-id',
                email: 'user@gmail.com',
                access_token: 'access-token',
                refresh_token: 'refresh-token',
                access_token_expiry_datetime: new Date('2099-01-01'),
            },
        })

        await prisma.certificateEmission.create({
            data: {
                id: '1',
                title: 'Certificate',
                user_id: '1',
                status: CERTIFICATE_STATUS.DRAFT,
            },
        })

        class GoogleAuthGatewayStub
            implements Pick<IGoogleAuthGateway, 'checkOrGetNewAccessToken'>
        {
            async checkOrGetNewAccessToken(): Promise<CheckOrRefreshAccessTokenOuput | null> {
                return null
            }
        }

        class GoogleDriveGatewayStub
            implements
                Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
        {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'data.xlsx',
                    fileMimeType: DATA_SOURCE_MIME_TYPE.XLSX,
                    thumbnailUrl: null,
                }
            }

            async downloadFile(): Promise<Buffer> {
                return Buffer.from('spreadsheet content')
            }
        }

        class SpreadsheetContentExtractorFactoryStub
            implements Pick<ISpreadsheetContentExtractorFactory, 'create'>
        {
            create(): Pick<
                ISpreadsheetContentExtractorStrategy,
                'extractColumns'
            > {
                return {
                    async extractColumns(): Promise<ExtractColumns> {
                        return {
                            columns: ['name', 'email'],
                            rows: [{ name: 'Alice', email: 'alice@test.com' }],
                        }
                    },
                }
            }
        }

        class BucketStub implements Pick<IBucket, 'deleteObject'> {
            async deleteObject(): Promise<void> {}
        }

        const useCase = new AddDataSourceByDrivePickerUseCase(
            new PrismaCertificatesRepository(prisma),
            new PrismaDataSourceRowsRepository(prisma),
            new GoogleDriveGatewayStub(),
            new SpreadsheetContentExtractorFactoryStub(),
            new PrismaUsersRepository(prisma),
            new GoogleAuthGatewayStub(),
            new BucketStub(),
            new PrismaTransactionManager(prisma),
        )

        await useCase.execute({
            certificateId: '1',
            fileIds: ['drive-file-id'],
            userId: '1',
        })

        const dataSource = await prisma.dataSource.findFirst({
            where: { certificate_emission_id: '1' },
        })

        expect(dataSource).toBeDefined()
        expect(dataSource?.input_method).toBe('GOOGLE_DRIVE')
        expect(dataSource?.file_extension).toBe(DATA_SOURCE_MIME_TYPE.XLSX)
        expect(dataSource?.google_account_email).toBe('user@gmail.com')

        const rows = await prisma.dataSourceRow.findMany({
            where: { data_source_id: '1' },
        })

        expect(rows).toHaveLength(1)
        expect(rows[0].processing_status).toBe('PENDING')

        const values = await prisma.dataSourceValue.findMany({
            where: { data_source_id: '1' },
        })

        expect(values).toHaveLength(2)
        expect(values.find(v => v.column_name === 'name')?.value).toBe('Alice')
        expect(values.find(v => v.column_name === 'email')?.value).toBe(
            'alice@test.com',
        )
    })

    it('deve reverter alterações no banco quando a última operação da transação falhar', async () => {
        await prisma.user.create({
            data: {
                id: '1',
                email: 'user@gmail.com',
                password_hash: 'password',
                name: 'User',
            },
        })

        await prisma.externalUserAccount.create({
            data: {
                user_id: '1',
                provider: 'GOOGLE',
                provider_user_id: 'google-user-id',
                email: 'user@gmail.com',
                access_token: 'access-token',
                refresh_token: 'refresh-token',
                access_token_expiry_datetime: new Date('2099-01-01'),
            },
        })

        await prisma.certificateEmission.create({
            data: {
                id: '1',
                title: 'Certificate',
                user_id: '1',
                status: CERTIFICATE_STATUS.DRAFT,
                DataSource: {
                    create: {
                        input_method: 'GOOGLE_DRIVE',
                        file_extension: 'xlsx',
                        google_account_email: null,
                        DataSourceFile: {
                            create: [
                                {
                                    file_index: 0,
                                    file_name: 'data.xlsx',
                                    drive_file_id: 'old-file-id',
                                    storage_file_url: null,
                                },
                            ],
                        },
                        DataSourceColumn: {
                            create: [{ name: 'name', type: 'STRING' }],
                        },
                        DataSourceRow: {
                            create: [
                                {
                                    id: 'row-1',
                                    processing_status: 'PENDING',
                                    source_row_index: 1,
                                    DataSourceValue: {
                                        create: [
                                            {
                                                column_name: 'name',
                                                value: 'OldRow1',
                                            },
                                        ],
                                    },
                                },
                                {
                                    id: 'row-2',
                                    processing_status: 'PENDING',
                                    source_row_index: 2,
                                    DataSourceValue: {
                                        create: [
                                            {
                                                column_name: 'name',
                                                value: 'OldRow2',
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                },
            },
        })

        class GoogleAuthGatewayStub
            implements Pick<IGoogleAuthGateway, 'checkOrGetNewAccessToken'>
        {
            async checkOrGetNewAccessToken(): Promise<CheckOrRefreshAccessTokenOuput | null> {
                return null
            }
        }

        class GoogleDriveGatewayStub
            implements
                Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
        {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'data.xlsx',
                    fileMimeType: DATA_SOURCE_MIME_TYPE.XLSX,
                    thumbnailUrl: null,
                }
            }
            async downloadFile(): Promise<Buffer> {
                return Buffer.from('content')
            }
        }

        class SpreadsheetContentExtractorFactoryStub
            implements Pick<ISpreadsheetContentExtractorFactory, 'create'>
        {
            create(): Pick<
                ISpreadsheetContentExtractorStrategy,
                'extractColumns'
            > {
                return {
                    async extractColumns(): Promise<ExtractColumns> {
                        return { columns: ['name'], rows: [{ name: 'NewRow' }] }
                    },
                }
            }
        }

        class BucketStub implements Pick<IBucket, 'deleteObject'> {
            async deleteObject(): Promise<void> {}
        }

        class DataSourceRowsRepositoryThrowingOnSave {
            constructor(
                private readonly real: PrismaDataSourceRowsRepository,
            ) {}

            async deleteManyByCertificateEmissionId(id: string) {
                return this.real.deleteManyByCertificateEmissionId(id)
            }

            async saveMany(): Promise<void> {
                throw new Error('database failure')
            }
        }

        const useCase = new AddDataSourceByDrivePickerUseCase(
            new PrismaCertificatesRepository(prisma),
            new DataSourceRowsRepositoryThrowingOnSave(
                new PrismaDataSourceRowsRepository(prisma),
            ),
            new GoogleDriveGatewayStub(),
            new SpreadsheetContentExtractorFactoryStub(),
            new PrismaUsersRepository(prisma),
            new GoogleAuthGatewayStub(),
            new BucketStub(),
            new PrismaTransactionManager(prisma),
        )

        await expect(
            useCase.execute({
                certificateId: '1',
                fileIds: ['drive-file-id'],
                userId: '1',
            }),
        ).rejects.toThrow()

        const rows = await prisma.dataSourceRow.findMany({
            where: { data_source_id: '1' },
        })
        expect(rows).toHaveLength(2)
    })
})
