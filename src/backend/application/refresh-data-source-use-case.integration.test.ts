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
import { PrismaCertificatesRepository } from '../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '../interface-adapters/repository/prisma/prisma-transaction-manager'
import { PrismaUsersRepository } from '../interface-adapters/repository/prisma/write/prisma-users-repository'
import { RefreshDataSourceUseCase } from './refresh-data-source-use-case'
import { prisma } from '@/tests/setup.integration'

describe('RefreshDataSourceUseCase (Integration)', () => {
    it('deve substituir as linhas existentes pelos dados mais recentes do Drive', async () => {
        await prisma.user.create({
            data: {
                id: '1',
                email: 'user@gmail.com',
                password_hash: 'password',
                name: 'User',
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
                                    drive_file_id: 'drive-file-id',
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
                                    processing_status: 'COMPLETED',
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
                                    processing_status: 'COMPLETED',
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
                return Buffer.from('updated spreadsheet')
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
                            columns: ['name'],
                            rows: [{ name: 'NewRow' }],
                        }
                    },
                }
            }
        }

        const useCase = new RefreshDataSourceUseCase(
            new PrismaCertificatesRepository(prisma),
            new PrismaDataSourceRowsRepository(prisma),
            new GoogleDriveGatewayStub(),
            new GoogleAuthGatewayStub(),
            new SpreadsheetContentExtractorFactoryStub(),
            new PrismaUsersRepository(prisma),
            new PrismaTransactionManager(prisma),
        )

        await useCase.execute({
            certificateId: '1',
            userId: '1',
        })

        const rows = await prisma.dataSourceRow.findMany({
            where: { data_source_id: '1' },
        })

        expect(rows).toHaveLength(1)

        const values = await prisma.dataSourceValue.findMany({
            where: { data_source_id: '1' },
        })

        expect(values).toHaveLength(1)
        expect(values[0].column_name).toBe('name')
        expect(values[0].value).toBe('NewRow')
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
                                    drive_file_id: 'drive-file-id',
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
                                    processing_status: 'COMPLETED',
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
                                    processing_status: 'COMPLETED',
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
                return Buffer.from('updated spreadsheet')
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

        const useCase = new RefreshDataSourceUseCase(
            new PrismaCertificatesRepository(prisma),
            new DataSourceRowsRepositoryThrowingOnSave(
                new PrismaDataSourceRowsRepository(prisma),
            ),
            new GoogleDriveGatewayStub(),
            new GoogleAuthGatewayStub(),
            new SpreadsheetContentExtractorFactoryStub(),
            new PrismaUsersRepository(prisma),
            new PrismaTransactionManager(prisma),
        )

        await expect(
            useCase.execute({ certificateId: '1', userId: '1' }),
        ).rejects.toThrow()

        const rows = await prisma.dataSourceRow.findMany({
            where: { data_source_id: '1' },
        })
        expect(rows).toHaveLength(2)
    })
})
