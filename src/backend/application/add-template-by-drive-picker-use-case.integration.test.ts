import { describe, expect, it } from 'vitest'
import { CERTIFICATE_STATUS } from '../domain/certificate'
import { TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
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
import { IBucket } from './interfaces/storage/ibucket'
import { IStringVariableExtractor } from './interfaces/extraction/istring-variable-extractor'
import { PrismaCertificatesRepository } from '../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '../interface-adapters/repository/prisma/prisma-transaction-manager'
import { PrismaUsersRepository } from '../interface-adapters/repository/prisma/write/prisma-users-repository'
import { AddTemplateByDrivePickerUseCase } from './add-template-by-drive-picker-use-case'
import { prisma } from '@/tests/setup.integration'

describe('AddTemplateByDrivePickerUseCase (Integration)', () => {
    it('deve criar template a partir do Google Drive com todos os campos persistidos', async () => {
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
                    name: 'template.docx',
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

        const useCase = new AddTemplateByDrivePickerUseCase(
            new PrismaCertificatesRepository(prisma),
            new GoogleDriveGatewayStub(),
            new FileContentExtractorFactoryStub(),
            new PrismaUsersRepository(prisma),
            new PrismaDataSourceRowsRepository(prisma),
            new GoogleAuthGatewayStub(),
            new BucketStub(),
            new PrismaTransactionManager(prisma),
            stringVariableExtractorStub,
        )

        await useCase.execute({
            certificateId: '1',
            fileId: 'drive-file-id',
            userId: '1',
        })

        const template = await prisma.template.findFirst({
            where: { certificate_emission_id: '1' },
        })

        expect(template).toBeDefined()
        expect(template?.file_name).toBe('template.docx')
        expect(template?.file_extension).toBe(TEMPLATE_FILE_MIME_TYPE.DOCX)
        expect(template?.drive_file_id).toBe('drive-file-id')
        expect(template?.input_method).toBe('GOOGLE_DRIVE')
        expect(template?.google_account_email).toBe('user@gmail.com')
        expect(template?.storage_file_url).toBeDefined()
        expect(template?.thumbnail_url).toBeNull()
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
                    name: 'template.docx',
                    fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
                    thumbnailUrl: null,
                }
            }
            async downloadFile(): Promise<Buffer> {
                return Buffer.from('content')
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
            extractVariables: () => ['name'],
        }

        const useCase = new AddTemplateByDrivePickerUseCase(
            new CertificatesRepositoryThrowingOnUpdate(
                new PrismaCertificatesRepository(prisma),
            ),
            new GoogleDriveGatewayStub(),
            new FileContentExtractorFactoryStub(),
            new PrismaUsersRepository(prisma),
            new PrismaDataSourceRowsRepository(prisma),
            new GoogleAuthGatewayStub(),
            new BucketStub(),
            new PrismaTransactionManager(prisma),
            stringVariableExtractorStub,
        )

        await expect(
            useCase.execute({
                certificateId: '1',
                fileId: 'drive-file-id',
                userId: '1',
            }),
        ).rejects.toThrow()

        const rows = await prisma.dataSourceRow.findMany({
            where: { data_source_id: '1' },
        })
        expect(rows.every(r => r.processing_status === 'COMPLETED')).toBe(true)
    })
})
