import { describe, expect, it } from 'vitest'
import { CERTIFICATE_STATUS, INPUT_METHOD } from '../domain/certificate'
import { TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import {
    GetFileMetadataOutput,
    IGoogleDriveGateway,
} from './interfaces/igoogle-drive-gateway'
import {
    CheckOrRefreshAccessTokenOuput,
    IGoogleAuthGateway,
} from './interfaces/igoogle-auth-gateway'
import {
    IFileContentExtractorFactory,
    IFileContentExtractorStrategy,
} from './interfaces/ifile-content-extractor-factory'
import { IBucket } from './interfaces/cloud/ibucket'
import { IStringVariableExtractor } from './interfaces/istring-variable-extractor'
import { PrismaCertificatesRepository } from '../infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../infrastructure/repository/prisma/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '../infrastructure/repository/prisma/prisma-transaction-manager'
import { PrismaUsersRepository } from '../infrastructure/repository/prisma/prisma-users-repository'
import { RefreshTemplateUseCase } from './refresh-template-use-case'
import { prisma } from '@/tests/setup.integration'

describe('RefreshTemplateUseCase (Integration)', () => {
    it('deve atualizar o template com os dados mais recentes do Drive', async () => {
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
                Template: {
                    create: {
                        file_name: 'template-original.docx',
                        file_extension: TEMPLATE_FILE_MIME_TYPE.DOCX,
                        input_method: INPUT_METHOD.GOOGLE_DRIVE,
                        drive_file_id: 'drive-file-id',
                        thumbnail_url: null,
                        storage_file_url: 'users/1/certificates/1/template.docx',
                    },
                },
            },
        })

        class GoogleAuthGatewayStub
            implements
                Pick<IGoogleAuthGateway, 'checkOrGetNewAccessToken'>
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
                    name: 'template-atualizado.docx',
                    fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
                    thumbnailUrl: null,
                }
            }

            async downloadFile(): Promise<Buffer> {
                return Buffer.from('updated file content')
            }
        }

        class FileContentExtractorFactoryStub
            implements Pick<IFileContentExtractorFactory, 'create'>
        {
            create(): IFileContentExtractorStrategy {
                return {
                    async extractText(): Promise<string> {
                        return '{{name}}'
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
            extractVariables: () => ['name'],
        }

        const useCase = new RefreshTemplateUseCase(
            new PrismaCertificatesRepository(prisma),
            new PrismaDataSourceRowsRepository(prisma),
            new GoogleDriveGatewayStub(),
            new GoogleAuthGatewayStub(),
            new FileContentExtractorFactoryStub(),
            new PrismaUsersRepository(prisma),
            new PrismaTransactionManager(prisma),
            new BucketStub(),
            stringVariableExtractorStub,
        )

        await useCase.execute({
            certificateId: '1',
            userId: '1',
        })

        const template = await prisma.template.findFirst({
            where: { certificate_emission_id: '1' },
        })

        expect(template).toBeDefined()
        expect(template?.file_name).toBe('template-atualizado.docx')
        expect(template?.drive_file_id).toBe('drive-file-id')
        expect(template?.input_method).toBe('GOOGLE_DRIVE')
    })

    it('deve reverter alterações no banco quando a última operação da transação falhar', async () => {
        await prisma.user.create({
            data: { id: '1', email: 'user@gmail.com', password_hash: 'password', name: 'User' },
        })

        await prisma.certificateEmission.create({
            data: {
                id: '1',
                title: 'Certificate',
                user_id: '1',
                status: CERTIFICATE_STATUS.DRAFT,
                Template: {
                    create: {
                        file_name: 'template-original.docx',
                        file_extension: TEMPLATE_FILE_MIME_TYPE.DOCX,
                        input_method: INPUT_METHOD.GOOGLE_DRIVE,
                        drive_file_id: 'drive-file-id',
                        thumbnail_url: null,
                        storage_file_url: 'users/1/certificates/1/template.docx',
                    },
                },
                DataSource: {
                    create: {
                        input_method: 'UPLOAD',
                        file_extension: 'xlsx',
                        google_account_email: null,
                        DataSourceFile: {
                            create: [{ file_index: 0, file_name: 'data.xlsx', drive_file_id: null, storage_file_url: null }],
                        },
                        DataSourceColumn: { create: [{ name: 'name', type: 'STRING' }] },
                        DataSourceRow: {
                            create: [
                                { id: 'row-1', processing_status: 'COMPLETED', source_row_index: 1, DataSourceValue: { create: [{ column_name: 'name', value: 'Alice' }] } },
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
            implements Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
        {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return { name: 'template-atualizado.docx', fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX, thumbnailUrl: null }
            }
            async downloadFile(): Promise<Buffer> {
                return Buffer.from('updated file content')
            }
        }

        class FileContentExtractorFactoryStub
            implements Pick<IFileContentExtractorFactory, 'create'>
        {
            create(): IFileContentExtractorStrategy {
                return { async extractText(): Promise<string> { return '{{name}}' } }
            }
        }

        class BucketStub implements Pick<IBucket, 'uploadObject'> {
            async uploadObject(): Promise<string> { return '' }
        }

        class CertificatesRepositoryThrowingOnUpdate {
            constructor(private readonly real: PrismaCertificatesRepository) {}
            async getById(id: string) { return this.real.getById(id) }
            async update(): Promise<void> { throw new Error('database failure') }
        }

        const stringVariableExtractorStub: Pick<IStringVariableExtractor, 'extractVariables'> = {
            extractVariables: () => ['name'],
        }

        const useCase = new RefreshTemplateUseCase(
            new CertificatesRepositoryThrowingOnUpdate(new PrismaCertificatesRepository(prisma)),
            new PrismaDataSourceRowsRepository(prisma),
            new GoogleDriveGatewayStub(),
            new GoogleAuthGatewayStub(),
            new FileContentExtractorFactoryStub(),
            new PrismaUsersRepository(prisma),
            new PrismaTransactionManager(prisma),
            new BucketStub(),
            stringVariableExtractorStub,
        )

        await expect(
            useCase.execute({ certificateId: '1', userId: '1' }),
        ).rejects.toThrow()

        const rows = await prisma.dataSourceRow.findMany({ where: { data_source_id: '1' } })
        expect(rows.every(r => r.processing_status === 'COMPLETED')).toBe(true)
    })
})