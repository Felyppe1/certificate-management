import { describe, expect, it } from 'vitest'
import { CERTIFICATE_STATUS } from '../domain/certificate'
import { DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
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
import { AddDataSourceByUploadUseCase } from './add-data-source-by-upload-use-case'
import { prisma } from '@/tests/setup.integration'

describe('AddDataSourceByUploadUseCase (Integration)', () => {
    it('deve criar fonte de dados a partir de upload com linhas e valores persistidos', async () => {
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
            },
        })

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
                            rows: [{ name: 'Bob' }],
                        }
                    },
                }
            }
        }

        class BucketStub
            implements Pick<IBucket, 'uploadObject' | 'deleteObject'>
        {
            async uploadObject(): Promise<string> {
                return ''
            }

            async deleteObject(): Promise<void> {}
        }

        const useCase = new AddDataSourceByUploadUseCase(
            new BucketStub(),
            new PrismaCertificatesRepository(prisma),
            new PrismaDataSourceRowsRepository(prisma),
            new SpreadsheetContentExtractorFactoryStub(),
            new PrismaTransactionManager(prisma),
            new PrismaUsersRepository(prisma),
        )

        const file = new File(
            [Buffer.from('spreadsheet content')],
            'data.xlsx',
            { type: DATA_SOURCE_MIME_TYPE.XLSX },
        )

        await useCase.execute({
            files: [file],
            certificateId: '1',
            userId: '1',
        })

        const dataSource = await prisma.dataSource.findFirst({
            where: { certificate_emission_id: '1' },
        })

        expect(dataSource).toBeDefined()
        expect(dataSource?.input_method).toBe('UPLOAD')
        expect(dataSource?.file_extension).toBe(DATA_SOURCE_MIME_TYPE.XLSX)

        const rows = await prisma.dataSourceRow.findMany({
            where: { data_source_id: '1' },
        })

        expect(rows).toHaveLength(1)
        expect(rows[0].processing_status).toBe('PENDING')

        const values = await prisma.dataSourceValue.findMany({
            where: { data_source_id: '1' },
        })

        expect(values).toHaveLength(1)
        expect(values[0].column_name).toBe('name')
        expect(values[0].value).toBe('Bob')
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
                        input_method: 'UPLOAD',
                        file_extension: 'xlsx',
                        google_account_email: null,
                        DataSourceFile: {
                            create: [
                                {
                                    file_index: 0,
                                    file_name: 'data.xlsx',
                                    drive_file_id: null,
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

        class BucketStub
            implements Pick<IBucket, 'uploadObject' | 'deleteObject'>
        {
            async uploadObject(): Promise<string> {
                return ''
            }
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

        const useCase = new AddDataSourceByUploadUseCase(
            new BucketStub(),
            new PrismaCertificatesRepository(prisma),
            new DataSourceRowsRepositoryThrowingOnSave(
                new PrismaDataSourceRowsRepository(prisma),
            ),
            new SpreadsheetContentExtractorFactoryStub(),
            new PrismaTransactionManager(prisma),
            new PrismaUsersRepository(prisma),
        )

        const file = new File([Buffer.from('content')], 'data.xlsx', {
            type: DATA_SOURCE_MIME_TYPE.XLSX,
        })

        await expect(
            useCase.execute({ files: [file], certificateId: '1', userId: '1' }),
        ).rejects.toThrow()

        const rows = await prisma.dataSourceRow.findMany({
            where: { data_source_id: '1' },
        })
        expect(rows).toHaveLength(2)
    })
})
