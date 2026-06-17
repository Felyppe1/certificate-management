import { vi, describe, it, expect, beforeAll } from 'vitest'
import { prisma as testPrisma } from '@/tests/setup.integration'
import { GetCertificateEmissionUseCase } from './get-certificate-emission-use-case'
import { CERTIFICATE_STATUS, INPUT_METHOD } from '@/backend/domain/certificate'
import { TEMPLATE_FILE_MIME_TYPE } from '@/backend/domain/template'
import { DATA_SOURCE_MIME_TYPE } from '@/backend/domain/data-source'
import { PROCESSING_STATUS_ENUM } from '@/backend/domain/data-source-row'
import { CertificateNotFoundError } from '@/backend/domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '@/backend/domain/error/forbidden-error/not-certificate-owner-error'

const prismaRef = vi.hoisted(() => ({ current: null as any }))

vi.mock('@/backend/infrastructure/repository/prisma', () => ({
    get prisma() {
        return prismaRef.current
    },
}))

beforeAll(() => {
    prismaRef.current = testPrisma
})

describe('GetCertificateEmissionUseCase (Integration)', () => {
    it('deve lançar erro quando certificado não for encontrado', async () => {
        await expect(
            new GetCertificateEmissionUseCase().execute({
                certificateId: 'inexistente',
                userId: 'user-1',
            }),
        ).rejects.toThrow(CertificateNotFoundError)
    })

    it('deve lançar erro quando usuário não for dono', async () => {
        await testPrisma.user.create({
            data: {
                id: 'user-1',
                email: 'u@test.com',
                name: 'Usuário',
                credits: 300,
            },
        })
        await testPrisma.certificateEmission.create({
            data: {
                id: 'cert-1',
                title: 'Teste',
                user_id: 'user-1',
                status: CERTIFICATE_STATUS.DRAFT,
            },
        })

        await expect(
            new GetCertificateEmissionUseCase().execute({
                certificateId: 'cert-1',
                userId: 'outro-user',
            }),
        ).rejects.toThrow(NotCertificateOwnerError)
    })

    it('deve retornar certificado com template, datasource e email nulos quando não configurados', async () => {
        const createdAt = new Date('2024-06-01T12:00:00.000Z')
        await testPrisma.user.create({
            data: {
                id: 'user-1',
                email: 'u@test.com',
                name: 'Usuário',
                credits: 300,
            },
        })
        await testPrisma.certificateEmission.create({
            data: {
                id: 'cert-1',
                title: 'Sem dados',
                user_id: 'user-1',
                status: CERTIFICATE_STATUS.DRAFT,
                created_at: createdAt,
            },
        })

        const result = await new GetCertificateEmissionUseCase().execute({
            certificateId: 'cert-1',
            userId: 'user-1',
        })

        expect(result).toMatchObject({
            id: 'cert-1',
            name: 'Sem dados',
            userId: 'user-1',
            status: CERTIFICATE_STATUS.DRAFT,
            createdAt,
            template: null,
            dataSource: null,
            email: null,
            variableColumnMapping: null,
        })
    })

    it('deve retornar template e datasource com todos os campos mapeados', async () => {
        await testPrisma.user.create({
            data: {
                id: 'user-1',
                email: 'u@test.com',
                name: 'Usuário',
                credits: 300,
            },
        })
        await testPrisma.certificateEmission.create({
            data: {
                id: 'cert-1',
                title: 'Completo',
                user_id: 'user-1',
                status: CERTIFICATE_STATUS.DRAFT,
                Template: {
                    create: {
                        file_extension: TEMPLATE_FILE_MIME_TYPE.DOCX,
                        file_name: 'template.docx',
                        input_method: INPUT_METHOD.UPLOAD,
                        drive_file_id: null,
                        storage_file_url: 'https://storage/template.docx',
                        thumbnail_url: null,
                        google_account_email: null,
                        TemplateVariable: {
                            create: [
                                { name: 'Nome', data_source_name: 'nome' },
                            ],
                        },
                    },
                },
                DataSource: {
                    create: {
                        input_method: INPUT_METHOD.UPLOAD,
                        file_extension: DATA_SOURCE_MIME_TYPE.CSV,
                        google_account_email: null,
                        thumbnail_url: null,
                        DataSourceFile: {
                            create: [
                                {
                                    file_index: 0,
                                    file_name: 'dados.csv',
                                    drive_file_id: null,
                                    storage_file_url:
                                        'https://storage/dados.csv',
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
                                    processing_status:
                                        PROCESSING_STATUS_ENUM.COMPLETED,
                                    source_row_index: 1,
                                    file_bytes: 2048,
                                    DataSourceValue: {
                                        create: [
                                            {
                                                column_name: 'nome',
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

        const result = await new GetCertificateEmissionUseCase().execute({
            certificateId: 'cert-1',
            userId: 'user-1',
        })

        expect(result.template).toMatchObject({
            fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
            fileName: 'template.docx',
            inputMethod: INPUT_METHOD.UPLOAD,
            variables: ['Nome'],
            driveFileId: null,
            storageFileUrl: 'https://storage/template.docx',
        })
        expect(result.variableColumnMapping).toEqual({ Nome: 'nome' })
        expect(result.dataSource).toMatchObject({
            files: [
                {
                    fileName: 'dados.csv',
                    driveFileId: null,
                    storageFileUrl: 'https://storage/dados.csv',
                },
            ],
            inputMethod: INPUT_METHOD.UPLOAD,
            fileMimeType: DATA_SOURCE_MIME_TYPE.CSV,
            columns: [
                {
                    name: 'nome',
                    type: 'string',
                    arraySeparator: null,
                    arrayItemType: null,
                },
            ],
        })
        expect(result.dataSource!.rows).toHaveLength(1)
        expect(result.dataSource!.rows[0]).toMatchObject({
            id: 'row-1',
            processingStatus: PROCESSING_STATUS_ENUM.COMPLETED,
            fileBytes: 2048,
            data: { nome: 'Alice' },
        })
    })

    it('deve retornar email configurado com todos os campos mapeados', async () => {
        await testPrisma.user.create({
            data: {
                id: 'user-1',
                email: 'u@test.com',
                name: 'Usuário',
                credits: 300,
            },
        })
        await testPrisma.certificateEmission.create({
            data: {
                id: 'cert-1',
                title: 'Com Email',
                user_id: 'user-1',
                status: CERTIFICATE_STATUS.EMITTED,
                DataSource: {
                    create: {
                        input_method: INPUT_METHOD.UPLOAD,
                        file_extension: DATA_SOURCE_MIME_TYPE.CSV,
                        google_account_email: null,
                        thumbnail_url: null,
                        DataSourceFile: {
                            create: [
                                {
                                    file_index: 0,
                                    file_name: 'dados.csv',
                                    drive_file_id: null,
                                    storage_file_url: null,
                                },
                            ],
                        },
                        DataSourceColumn: {
                            create: [{ name: 'email', type: 'STRING' }],
                        },
                        DataSourceRow: {
                            create: [
                                {
                                    id: 'row-1',
                                    processing_status:
                                        PROCESSING_STATUS_ENUM.COMPLETED,
                                    source_row_index: 1,
                                    DataSourceValue: {
                                        create: [
                                            {
                                                column_name: 'email',
                                                value: 'alice@test.com',
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
        await testPrisma.email.create({
            data: {
                certificate_emission_id: 'cert-1',
                subject: 'Seu certificado',
                body: 'Segue em anexo',
                email_column: 'email',
                status: 'PENDING',
                email_error_type: null,
                scheduled_at: null,
            },
        })

        const result = await new GetCertificateEmissionUseCase().execute({
            certificateId: 'cert-1',
            userId: 'user-1',
        })

        expect(result.email).toMatchObject({
            subject: 'Seu certificado',
            body: 'Segue em anexo',
            emailColumn: 'email',
            scheduledAt: null,
            emailErrorType: null,
            status: 'PENDING',
        })
    })
})
