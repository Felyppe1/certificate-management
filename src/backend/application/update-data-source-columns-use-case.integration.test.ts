import { describe, expect, it } from 'vitest'
import { CERTIFICATE_STATUS } from '../domain/certificate'
import { PrismaCertificatesRepository } from '../infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../infrastructure/repository/prisma/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '../infrastructure/repository/prisma/prisma-transaction-manager'
import { UpdateDataSourceColumnsUseCase } from './update-data-source-columns-use-case'
import { prisma } from '@/tests/setup.integration'

describe('UpdateDataSourceColumnsUseCase (Integration)', () => {
    it('deve redefinir o status de processamento das linhas ao atualizar colunas com sucesso', async () => {
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
                                    storage_file_url: 'users/1/certificates/1/data-source.xlsx',
                                },
                            ],
                        },
                        DataSourceColumn: {
                            create: [
                                { name: 'name', type: 'STRING' },
                                { name: 'email', type: 'STRING' },
                            ],
                        },
                        DataSourceRow: {
                            create: [
                                {
                                    id: 'row-1',
                                    processing_status: 'COMPLETED',
                                    source_row_index: 1,
                                    DataSourceValue: {
                                        create: [
                                            { column_name: 'name', value: 'Alice' },
                                            { column_name: 'email', value: 'alice@test.com' },
                                        ],
                                    },
                                },
                                {
                                    id: 'row-2',
                                    processing_status: 'COMPLETED',
                                    source_row_index: 2,
                                    DataSourceValue: {
                                        create: [
                                            { column_name: 'name', value: 'Bob' },
                                            { column_name: 'email', value: 'bob@test.com' },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                },
            },
        })

        const useCase = new UpdateDataSourceColumnsUseCase(
            new PrismaCertificatesRepository(prisma),
            new PrismaDataSourceRowsRepository(prisma),
            new PrismaTransactionManager(prisma),
        )

        const result = await useCase.execute({
            userId: '1',
            certificateId: '1',
            columns: [
                { name: 'name', type: 'string', arrayMetadata: null },
                { name: 'email', type: 'string', arrayMetadata: null },
            ],
        })

        expect(result.invalidColumns).toHaveLength(0)

        const rows = await prisma.dataSourceRow.findMany({
            where: { data_source_id: '1' },
        })

        expect(rows).toHaveLength(2)
        expect(rows.every(r => r.processing_status === 'PENDING')).toBe(true)
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
                            create: [
                                {
                                    file_index: 0,
                                    file_name: 'data.xlsx',
                                    drive_file_id: null,
                                    storage_file_url: 'users/1/certificates/1/data-source.xlsx',
                                },
                            ],
                        },
                        DataSourceColumn: {
                            create: [
                                { name: 'name', type: 'STRING' },
                                { name: 'email', type: 'STRING' },
                            ],
                        },
                        DataSourceRow: {
                            create: [
                                {
                                    id: 'row-1',
                                    processing_status: 'COMPLETED',
                                    source_row_index: 1,
                                    DataSourceValue: {
                                        create: [
                                            { column_name: 'name', value: 'Alice' },
                                            { column_name: 'email', value: 'alice@test.com' },
                                        ],
                                    },
                                },
                                {
                                    id: 'row-2',
                                    processing_status: 'COMPLETED',
                                    source_row_index: 2,
                                    DataSourceValue: {
                                        create: [
                                            { column_name: 'name', value: 'Bob' },
                                            { column_name: 'email', value: 'bob@test.com' },
                                        ],
                                    },
                                },
                            ],
                        },
                    },
                },
            },
        })

        class CertificatesRepositoryThrowingOnUpdate {
            constructor(private readonly real: PrismaCertificatesRepository) {}
            async getById(id: string) { return this.real.getById(id) }
            async update(): Promise<void> { throw new Error('database failure') }
        }

        const useCase = new UpdateDataSourceColumnsUseCase(
            new CertificatesRepositoryThrowingOnUpdate(new PrismaCertificatesRepository(prisma)),
            new PrismaDataSourceRowsRepository(prisma),
            new PrismaTransactionManager(prisma),
        )

        await expect(
            useCase.execute({
                userId: '1',
                certificateId: '1',
                columns: [
                    { name: 'name', type: 'string', arrayMetadata: null },
                    { name: 'email', type: 'string', arrayMetadata: null },
                ],
            }),
        ).rejects.toThrow()

        const rows = await prisma.dataSourceRow.findMany({ where: { data_source_id: '1' } })
        expect(rows.every(r => r.processing_status === 'COMPLETED')).toBe(true)
    })
})