import { describe, expect, it } from 'vitest'
import { CERTIFICATE_STATUS } from '../domain/certificate'
import {
    GetFileMetadataOutput,
    IGoogleDriveGateway,
} from './interfaces/gateway/igoogle-drive-gateway'
import { TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import {
    IFileContentExtractorFactory,
    IFileContentExtractorStrategy,
} from './interfaces/extraction/ifile-content-extractor-factory'
import { IBucket } from './interfaces/storage/ibucket'
import { IStringVariableExtractor } from './interfaces/extraction/istring-variable-extractor'
import { PrismaCertificatesRepository } from '../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '../interface-adapters/repository/prisma/prisma-transaction-manager'
import { PrismaUsersRepository } from '../interface-adapters/repository/prisma/write/prisma-users-repository'
import { AddTemplateByUrlUseCase } from './add-template-by-url-use-case'
import { prisma } from '@/tests/setup.integration'

describe('AddTemplateByUrlUseCase (Integration)', () => {
    it('should create a template by url successfully', async () => {
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
                title: 'Name',
                user_id: '1',
                status: CERTIFICATE_STATUS.DRAFT,
            },
        })

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

        const stringVariableExtractorStub: Pick<
            IStringVariableExtractor,
            'extractVariables'
        > = {
            extractVariables: () => ['name', 'email'],
        }

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            new PrismaCertificatesRepository(prisma),
            new PrismaDataSourceRowsRepository(prisma),
            new GoogleDriveGatewayStub(),
            new FileContentExtractorFactoryStub(),
            new BucketStub(),
            new PrismaTransactionManager(prisma),
            stringVariableExtractorStub,
            new PrismaUsersRepository(prisma),
        )

        await addTemplateByUrlUseCase.execute({
            certificateId: '1',
            userId: '1',
            fileUrl: 'https://drive.google.com/file/d/abc123/view',
        })

        const template = await prisma.template.findFirst({
            where: { certificate_emission_id: '1' },
        })

        expect(template).toBeDefined()
        expect(template?.file_name).toBe('filename')
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
                title: 'Name',
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
                                    processing_status: 'COMPLETED',
                                    source_row_index: 1,
                                    DataSourceValue: {
                                        create: [
                                            {
                                                column_name: 'name',
                                                value: 'Alice',
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

        class CertificatesRepositoryThrowingOnUpdate {
            constructor(private readonly real: PrismaCertificatesRepository) {}
            async getById(id: string) {
                return this.real.getById(id)
            }
            async update(): Promise<void> {
                throw new Error('database failure')
            }
        }

        const stringVariableExtractorStub: Pick<
            IStringVariableExtractor,
            'extractVariables'
        > = {
            extractVariables: () => ['name', 'email'],
        }

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            new CertificatesRepositoryThrowingOnUpdate(
                new PrismaCertificatesRepository(prisma),
            ),
            new PrismaDataSourceRowsRepository(prisma),
            new GoogleDriveGatewayStub(),
            new FileContentExtractorFactoryStub(),
            new BucketStub(),
            new PrismaTransactionManager(prisma),
            stringVariableExtractorStub,
            new PrismaUsersRepository(prisma),
        )

        await expect(
            addTemplateByUrlUseCase.execute({
                certificateId: '1',
                userId: '1',
                fileUrl: 'https://drive.google.com/file/d/abc123/view',
            }),
        ).rejects.toThrow()

        const rows = await prisma.dataSourceRow.findMany({
            where: { data_source_id: '1' },
        })
        expect(rows.every(r => r.processing_status === 'COMPLETED')).toBe(true)
    })
})
