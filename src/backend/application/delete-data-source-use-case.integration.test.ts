import { describe, expect, it } from 'vitest'
import { CERTIFICATE_STATUS } from '../domain/certificate'
import { IBucket } from './interfaces/storage/ibucket'
import { PrismaCertificatesRepository } from '../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { DeleteDataSourceUseCase } from './delete-data-source-use-case'
import { prisma } from '@/tests/setup.integration'

describe('DeleteDataSourceUseCase (Integration)', () => {
    it('deve remover a fonte de dados do certificado', async () => {
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
                        input_method: 'GOOGLE_DRIVE',
                        file_extension: 'xlsx',
                        google_account_email: null,
                        DataSourceFile: {
                            create: [
                                {
                                    file_index: 0,
                                    file_name: 'data.xlsx',
                                    drive_file_id: 'drive-file-id',
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

        class BucketStub implements Pick<IBucket, 'deleteObject'> {
            async deleteObject(): Promise<void> {}
        }

        const useCase = new DeleteDataSourceUseCase(
            new PrismaCertificatesRepository(prisma),
            new BucketStub(),
        )

        await useCase.execute({
            certificateId: '1',
            userId: '1',
        })

        const dataSource = await prisma.dataSource.findFirst({
            where: { certificate_emission_id: '1' },
        })

        expect(dataSource).toBeNull()
    })
})
