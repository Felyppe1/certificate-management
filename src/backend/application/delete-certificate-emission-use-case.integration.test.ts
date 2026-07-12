import { describe, it, expect } from 'vitest'
import { DeleteCertificateEmissionUseCase } from './delete-certificate-emission-use-case'
import { PrismaCertificatesRepository } from '../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { IBucket } from './interfaces/storage/ibucket'
import { CERTIFICATE_STATUS, INPUT_METHOD } from '../domain/certificate'
import { TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { PROCESSING_STATUS_ENUM } from '../domain/email'
import { prisma } from '@/tests/setup.integration'

describe('DeleteCertificateEmissionUseCase (Integration)', () => {
    it('deve excluir a emissão e todas as suas relações do banco', async () => {
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
                status: CERTIFICATE_STATUS.GENERATED,
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
                                    processing_status: 'COMPLETED',
                                    source_row_index: 1,
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
                Email: {
                    create: {
                        id: 'email-1',
                        subject: 'Seu certificado',
                        body: 'Olá!',
                        email_column: 'nome',
                        status: PROCESSING_STATUS_ENUM.FAILED,
                        email_error_type: null,
                        scheduled_at: null,
                    },
                },
            },
        })

        class BucketStub implements Pick<IBucket, 'deleteObject'> {
            async deleteObject() {}
        }

        const useCase = new DeleteCertificateEmissionUseCase(
            new PrismaCertificatesRepository(prisma),
            new BucketStub(),
        )

        await useCase.execute({ certificateId: '1', userId: '1' })

        expect(
            await prisma.certificateEmission.findUnique({ where: { id: '1' } }),
        ).toBeNull()
        expect(
            await prisma.template.findFirst({
                where: { certificate_emission_id: '1' },
            }),
        ).toBeNull()
        expect(
            await prisma.templateVariable.findMany({
                where: { template_id: '1' },
            }),
        ).toHaveLength(0)
        expect(
            await prisma.dataSource.findFirst({
                where: { certificate_emission_id: '1' },
            }),
        ).toBeNull()
        expect(
            await prisma.dataSourceFile.findMany({
                where: { data_source_id: '1' },
            }),
        ).toHaveLength(0)
        expect(
            await prisma.dataSourceColumn.findMany({
                where: { data_source_id: '1' },
            }),
        ).toHaveLength(0)
        expect(
            await prisma.dataSourceRow.findMany({
                where: { data_source_id: '1' },
            }),
        ).toHaveLength(0)
        expect(
            await prisma.dataSourceValue.findMany({
                where: { data_source_id: '1' },
            }),
        ).toHaveLength(0)
        expect(
            await prisma.email.findFirst({
                where: { certificate_emission_id: '1' },
            }),
        ).toBeNull()
    })
})
