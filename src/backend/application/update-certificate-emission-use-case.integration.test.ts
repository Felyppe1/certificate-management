import { describe, it, expect } from 'vitest'
import { UpdateCertificateEmissionUseCase } from './update-certificate-emission-use-case'
import { PrismaCertificatesRepository } from '../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '../interface-adapters/repository/prisma/prisma-transaction-manager'
import { CERTIFICATE_STATUS, INPUT_METHOD } from '../domain/certificate'
import { TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { prisma } from '@/tests/setup.integration'

describe('UpdateCertificateEmissionUseCase (Integration)', () => {
    describe('atualização de nome', () => {
        it('deve atualizar o nome da emissão no banco', async () => {
            await prisma.user.create({
                data: {
                    id: '1',
                    email: 'user@example.com',
                    name: 'User',
                    password_hash: 'hash',
                },
            })

            await prisma.certificateEmission.create({
                data: {
                    id: '1',
                    title: 'Nome Original',
                    user_id: '1',
                    status: CERTIFICATE_STATUS.DRAFT,
                },
            })

            const useCase = new UpdateCertificateEmissionUseCase(
                new PrismaCertificatesRepository(prisma),
                new PrismaDataSourceRowsRepository(prisma),
                new PrismaTransactionManager(prisma),
            )

            await useCase.execute({ id: '1', userId: '1', name: 'Novo Nome' })

            const record = await prisma.certificateEmission.findUnique({
                where: { id: '1' },
            })

            expect(record?.title).toBe('Novo Nome')
        })
    })

    describe('atualização de mapeamento de variáveis', () => {
        it('deve salvar novo mapeamento e resetar status das linhas', async () => {
            await prisma.user.create({
                data: {
                    id: '1',
                    email: 'user@example.com',
                    name: 'User',
                    password_hash: 'hash',
                },
            })

            await prisma.certificateEmission.create({
                data: {
                    id: '1',
                    title: 'Certificado',
                    user_id: '1',
                    status: CERTIFICATE_STATUS.DRAFT,
                    Template: {
                        create: {
                            file_name: 'template.docx',
                            file_extension: TEMPLATE_FILE_MIME_TYPE.DOCX,
                            input_method: INPUT_METHOD.UPLOAD,
                            storage_file_url:
                                'users/1/certificates/1/template.docx',
                            drive_file_id: null,
                            thumbnail_url: null,
                            TemplateVariable: {
                                create: [{ name: 'nome' }],
                            },
                        },
                    },
                    DataSource: {
                        create: {
                            input_method: INPUT_METHOD.UPLOAD,
                            file_extension: 'xlsx',
                            google_account_email: null,
                            DataSourceFile: {
                                create: [
                                    {
                                        file_index: 0,
                                        file_name: 'data.xlsx',
                                        drive_file_id: null,
                                        storage_file_url:
                                            'users/1/certificates/1/data.xlsx',
                                    },
                                ],
                            },
                            DataSourceColumn: {
                                create: [{ name: 'nome', type: 'STRING' }],
                            },
                            DataSourceRow: {
                                create: [
                                    {
                                        id: 'row-1',
                                        processing_status: 'RUNNING',
                                        source_row_index: 1,
                                    },
                                    {
                                        id: 'row-2',
                                        processing_status: 'RUNNING',
                                        source_row_index: 2,
                                    },
                                ],
                            },
                        },
                    },
                },
            })

            const useCase = new UpdateCertificateEmissionUseCase(
                new PrismaCertificatesRepository(prisma),
                new PrismaDataSourceRowsRepository(prisma),
                new PrismaTransactionManager(prisma),
            )

            await useCase.execute({
                id: '1',
                userId: '1',
                variableColumnMapping: { nome: 'nome' },
            })

            const rows = await prisma.dataSourceRow.findMany({
                where: { data_source_id: '1' },
            })
            expect(rows.every(r => r.processing_status === 'PENDING')).toBe(
                true,
            )

            const templateVariable = await prisma.templateVariable.findFirst({
                where: { template_id: '1', name: 'nome' },
            })
            expect(templateVariable?.data_source_name).toBe('nome')
            expect(templateVariable?.data_source_id).toBe('1')
        })

        it('deve reverter o reset de status das linhas quando falha ao atualizar certificado na transação', async () => {
            await prisma.user.create({
                data: {
                    id: '1',
                    email: 'user@example.com',
                    name: 'User',
                    password_hash: 'hash',
                },
            })

            await prisma.certificateEmission.create({
                data: {
                    id: '1',
                    title: 'Certificado',
                    user_id: '1',
                    status: CERTIFICATE_STATUS.DRAFT,
                    Template: {
                        create: {
                            file_name: 'template.docx',
                            file_extension: TEMPLATE_FILE_MIME_TYPE.DOCX,
                            input_method: INPUT_METHOD.UPLOAD,
                            storage_file_url:
                                'users/1/certificates/1/template.docx',
                            drive_file_id: null,
                            thumbnail_url: null,
                            TemplateVariable: {
                                create: [{ name: 'nome' }],
                            },
                        },
                    },
                    DataSource: {
                        create: {
                            input_method: INPUT_METHOD.UPLOAD,
                            file_extension: 'xlsx',
                            google_account_email: null,
                            DataSourceFile: {
                                create: [
                                    {
                                        file_index: 0,
                                        file_name: 'data.xlsx',
                                        drive_file_id: null,
                                        storage_file_url:
                                            'users/1/certificates/1/data.xlsx',
                                    },
                                ],
                            },
                            DataSourceColumn: {
                                create: [{ name: 'nome', type: 'STRING' }],
                            },
                            DataSourceRow: {
                                create: [
                                    {
                                        id: 'row-1',
                                        processing_status: 'RUNNING',
                                        source_row_index: 1,
                                    },
                                    {
                                        id: 'row-2',
                                        processing_status: 'RUNNING',
                                        source_row_index: 2,
                                    },
                                ],
                            },
                        },
                    },
                },
            })

            const realCertificatesRepository = new PrismaCertificatesRepository(
                prisma,
            )

            class CertificatesRepositoryThrowingOnUpdate {
                constructor(
                    private readonly real: PrismaCertificatesRepository,
                ) {}
                async getById(id: string) {
                    return this.real.getById(id)
                }
                async update(): Promise<void> {
                    throw new Error('database failure')
                }
            }

            const useCase = new UpdateCertificateEmissionUseCase(
                new CertificatesRepositoryThrowingOnUpdate(
                    realCertificatesRepository,
                ),
                new PrismaDataSourceRowsRepository(prisma),
                new PrismaTransactionManager(prisma),
            )

            await expect(
                useCase.execute({
                    id: '1',
                    userId: '1',
                    variableColumnMapping: { nome: 'nome' },
                }),
            ).rejects.toThrow()

            const rows = await prisma.dataSourceRow.findMany({
                where: { data_source_id: '1' },
            })
            expect(rows.every(r => r.processing_status === 'RUNNING')).toBe(
                true,
            )
        })
    })
})
