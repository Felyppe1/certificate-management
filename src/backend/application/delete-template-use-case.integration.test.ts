import { describe, expect, it } from 'vitest'
import { INPUT_METHOD } from '@/backend/domain/certificate'
import { TEMPLATE_FILE_MIME_TYPE } from '@/backend/domain/template'
import { IBucket } from '@/backend/application/interfaces/cloud/ibucket'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'
import { DeleteTemplateUseCase } from '@/backend/application/delete-template-use-case'
import { prisma } from '@/tests/setup.integration'

describe('DeleteTemplateUseCase (Integration)', () => {
    it('should delete a template successfully', async () => {
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
                Template: {
                    create: {
                        file_extension: TEMPLATE_FILE_MIME_TYPE.DOCX,
                        file_name: 'filename',
                        input_method: INPUT_METHOD.URL,
                        drive_file_id: '1',
                        thumbnail_url: null,
                        storage_file_url: 'https://storage-url',
                    },
                },
            },
        })

        class BucketStub implements Pick<IBucket, 'deleteObject'> {
            async deleteObject() {}
        }

        const deleteTemplateUseCase = new DeleteTemplateUseCase(
            new PrismaCertificatesRepository(prisma),
            new PrismaDataSourceRowsRepository(prisma),
            new BucketStub(),
            new PrismaTransactionManager(prisma),
        )

        await deleteTemplateUseCase.execute({
            certificateId: '1',
            userId: '1',
        })

        const template = await prisma.template.findFirst({
            where: { certificate_emission_id: '1' },
        })

        expect(template).toBeNull()
    })

    it('deve reverter alterações no banco quando a última operação da transação falhar', async () => {
        await prisma.user.create({
            data: { id: '1', email: 'user@gmail.com', password_hash: 'password', name: 'User' },
        })

        await prisma.certificateEmission.create({
            data: {
                id: '1',
                title: 'Name',
                user_id: '1',
                status: CERTIFICATE_STATUS.DRAFT,
                Template: {
                    create: {
                        file_extension: TEMPLATE_FILE_MIME_TYPE.DOCX,
                        file_name: 'filename',
                        input_method: INPUT_METHOD.URL,
                        drive_file_id: '1',
                        thumbnail_url: null,
                        storage_file_url: 'https://storage-url',
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

        class BucketStub implements Pick<IBucket, 'deleteObject'> {
            async deleteObject() {}
        }

        class CertificatesRepositoryThrowingOnUpdate {
            constructor(private readonly real: PrismaCertificatesRepository) {}
            async getById(id: string) { return this.real.getById(id) }
            async update(): Promise<void> { throw new Error('database failure') }
        }

        const deleteTemplateUseCase = new DeleteTemplateUseCase(
            new CertificatesRepositoryThrowingOnUpdate(new PrismaCertificatesRepository(prisma)),
            new PrismaDataSourceRowsRepository(prisma),
            new BucketStub(),
            new PrismaTransactionManager(prisma),
        )

        await expect(
            deleteTemplateUseCase.execute({ certificateId: '1', userId: '1' }),
        ).rejects.toThrow()

        const rows = await prisma.dataSourceRow.findMany({ where: { data_source_id: '1' } })
        expect(rows.every(r => r.processing_status === 'COMPLETED')).toBe(true)
    })
})