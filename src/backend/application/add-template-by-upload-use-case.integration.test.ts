import { describe, expect, it } from 'vitest'
import { CERTIFICATE_STATUS } from '../domain/certificate'
import { TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
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
import { AddTemplateByUploadUseCase } from './add-template-by-upload-use-case'
import { prisma } from '@/tests/setup.integration'

describe('AddTemplateByUploadUseCase (Integration)', () => {
    it('deve criar template a partir de upload com todos os campos persistidos', async () => {
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

        const useCase = new AddTemplateByUploadUseCase(
            new BucketStub(),
            new PrismaCertificatesRepository(prisma),
            new PrismaDataSourceRowsRepository(prisma),
            new FileContentExtractorFactoryStub(),
            new PrismaTransactionManager(prisma),
            stringVariableExtractorStub,
            new PrismaUsersRepository(prisma),
        )

        const file = new File(
            [Buffer.from('file content')],
            'template.docx',
            { type: TEMPLATE_FILE_MIME_TYPE.DOCX },
        )

        await useCase.execute({
            file,
            certificateId: '1',
            userId: '1',
        })

        const template = await prisma.template.findFirst({
            where: { certificate_emission_id: '1' },
        })

        expect(template).toBeDefined()
        expect(template?.file_name).toBe('template.docx')
        expect(template?.file_extension).toBe(TEMPLATE_FILE_MIME_TYPE.DOCX)
        expect(template?.drive_file_id).toBeNull()
        expect(template?.input_method).toBe('UPLOAD')
        expect(template?.thumbnail_url).toBeNull()
        expect(template?.storage_file_url).toBeDefined()
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

        const useCase = new AddTemplateByUploadUseCase(
            new BucketStub(),
            new CertificatesRepositoryThrowingOnUpdate(new PrismaCertificatesRepository(prisma)),
            new PrismaDataSourceRowsRepository(prisma),
            new FileContentExtractorFactoryStub(),
            new PrismaTransactionManager(prisma),
            stringVariableExtractorStub,
            new PrismaUsersRepository(prisma),
        )

        const file = new File([Buffer.from('content')], 'template.docx', { type: TEMPLATE_FILE_MIME_TYPE.DOCX })

        await expect(
            useCase.execute({ file, certificateId: '1', userId: '1' }),
        ).rejects.toThrow()

        const rows = await prisma.dataSourceRow.findMany({ where: { data_source_id: '1' } })
        expect(rows.every(r => r.processing_status === 'COMPLETED')).toBe(true)
    })
})