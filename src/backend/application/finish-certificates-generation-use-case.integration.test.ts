import { describe, it, expect } from 'vitest'
import { FinishCertificatesGenerationUseCase } from './finish-certificates-generation-use-case'
import { PrismaDataSourceRowsRepository } from '../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { PrismaCertificatesRepository } from '../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaUsersRepository } from '../interface-adapters/repository/prisma/write/prisma-users-repository'
import { PrismaTransactionManager } from '../interface-adapters/repository/prisma/prisma-transaction-manager'
import { CERTIFICATE_STATUS, INPUT_METHOD } from '../domain/certificate'
import { prisma } from '@/tests/setup.integration'

describe('FinishCertificatesGenerationUseCase (Integration)', () => {
    it('deve marcar linha como concluída e emissão como gerada quando é a última linha a finalizar', async () => {
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
                DataSource: {
                    create: {
                        input_method: INPUT_METHOD.UPLOAD,
                        file_extension: 'xlsx',
                        google_account_email: null,
                        DataSourceRow: {
                            create: [
                                {
                                    id: 'row-1',
                                    processing_status: 'RUNNING',
                                    source_row_index: 1,
                                },
                            ],
                        },
                    },
                },
            },
        })

        const useCase = new FinishCertificatesGenerationUseCase(
            new PrismaDataSourceRowsRepository(prisma),
            new PrismaCertificatesRepository(prisma),
            new PrismaUsersRepository(prisma),
            new PrismaTransactionManager(prisma),
        )

        await useCase.execute({
            dataSourceRowId: 'row-1',
            success: true,
            totalBytes: 1024,
            userId: '1',
        })

        const row = await prisma.dataSourceRow.findUnique({
            where: { id: 'row-1' },
        })
        expect(row?.processing_status).toBe('COMPLETED')
        expect(row?.file_bytes).toBe(1024)

        const certificate = await prisma.certificateEmission.findUnique({
            where: { id: '1' },
        })
        expect(certificate?.status).toBe('GENERATED')

        const dailyUsage = await prisma.dailyUsage.findFirst({
            where: { user_id: '1' },
        })
        expect(dailyUsage?.certificates_generated_count).toBe(1)
    })

    it('deve manter a emissão em rascunho quando ainda há linhas em processamento', async () => {
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
                DataSource: {
                    create: {
                        input_method: INPUT_METHOD.UPLOAD,
                        file_extension: 'xlsx',
                        google_account_email: null,
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

        const useCase = new FinishCertificatesGenerationUseCase(
            new PrismaDataSourceRowsRepository(prisma),
            new PrismaCertificatesRepository(prisma),
            new PrismaUsersRepository(prisma),
            new PrismaTransactionManager(prisma),
        )

        await useCase.execute({
            dataSourceRowId: 'row-1',
            success: true,
            totalBytes: 512,
            userId: '1',
        })

        const certificate = await prisma.certificateEmission.findUnique({
            where: { id: '1' },
        })
        expect(certificate?.status).toBe('DRAFT')
    })
})
