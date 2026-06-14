import { describe, it, expect } from 'vitest'
import { CreateEmailUseCase } from './create-email-use-case'
import { PrismaCertificatesRepository } from '../infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../infrastructure/repository/prisma/prisma-data-source-rows-repository'
import { PrismaEmailsRepository } from '../infrastructure/repository/prisma/prisma-emails-repository'
import { PrismaTransactionManager } from '../infrastructure/repository/prisma/prisma-transaction-manager'
import { IQueue } from './interfaces/cloud/iqueue'
import { CERTIFICATE_STATUS, INPUT_METHOD } from '../domain/certificate'
import { prisma } from '@/tests/setup.integration'

describe('CreateEmailUseCase (Integration)', () => {
    async function createBaseFixture() {
        await prisma.user.create({
            data: { id: '1', email: 'user@example.com', name: 'User', password_hash: 'hash' },
        })

        await prisma.certificateEmission.create({
            data: {
                id: '1',
                title: 'Certificado',
                user_id: '1',
                status: CERTIFICATE_STATUS.GENERATED,
                DataSource: {
                    create: {
                        input_method: INPUT_METHOD.UPLOAD,
                        file_extension: 'xlsx',
                        google_account_email: null,
                        DataSourceFile: {
                            create: [{ file_index: 0, file_name: 'data.xlsx', drive_file_id: null, storage_file_url: 'users/1/certificates/1/data.xlsx' }],
                        },
                        DataSourceColumn: {
                            create: [{ name: 'email', type: 'STRING' }],
                        },
                        DataSourceRow: {
                            create: [
                                {
                                    id: 'row-1',
                                    processing_status: 'COMPLETED',
                                    source_row_index: 1,
                                    DataSourceValue: {
                                        create: [{ column_name: 'email', value: 'alice@example.com' }],
                                    },
                                },
                            ],
                        },
                    },
                },
            },
        })
    }

    class QueueStub implements Pick<IQueue, 'enqueueSendCertificateEmails'> {
        async enqueueSendCertificateEmails() {}
    }

    it('deve criar email com sucesso, persistir todos os campos e marcar certificado como emitido', async () => {
        await createBaseFixture()

        const useCase = new CreateEmailUseCase(
            new PrismaCertificatesRepository(prisma),
            new PrismaDataSourceRowsRepository(prisma),
            new PrismaEmailsRepository(prisma),
            new QueueStub(),
            new PrismaTransactionManager(prisma),
        )

        await useCase.execute({
            userId: '1',
            certificateEmissionId: '1',
            subject: 'Seu certificado chegou',
            body: 'Olá! Segue seu certificado.',
            emailColumn: 'email',
            scheduledAt: null,
        })

        const email = await prisma.email.findFirst({ where: { certificate_emission_id: '1' } })
        expect(email).not.toBeNull()
        expect(email?.subject).toBe('Seu certificado chegou')
        expect(email?.body).toBe('Olá! Segue seu certificado.')
        expect(email?.email_column).toBe('email')
        expect(email?.status).toBe('RUNNING')

        const certificate = await prisma.certificateEmission.findUnique({ where: { id: '1' } })
        expect(certificate?.status).toBe('EMITTED')
    })

    it('deve reverter o salvamento do email quando falha ao atualizar a emissão na transação', async () => {
        await createBaseFixture()

        const realCertificatesRepository = new PrismaCertificatesRepository(prisma)

        class CertificatesRepositoryThrowingOnUpdate {
            constructor(private readonly real: PrismaCertificatesRepository) {}
            async getById(id: string) {
                return this.real.getById(id)
            }
            async update(): Promise<void> {
                throw new Error('database failure')
            }
        }

        const useCase = new CreateEmailUseCase(
            new CertificatesRepositoryThrowingOnUpdate(realCertificatesRepository),
            new PrismaDataSourceRowsRepository(prisma),
            new PrismaEmailsRepository(prisma),
            new QueueStub(),
            new PrismaTransactionManager(prisma),
        )

        await expect(
            useCase.execute({
                userId: '1',
                certificateEmissionId: '1',
                subject: 'Seu certificado chegou',
                body: 'Olá! Segue seu certificado.',
                emailColumn: 'email',
                scheduledAt: null,
            }),
        ).rejects.toThrow()

        const email = await prisma.email.findFirst({ where: { certificate_emission_id: '1' } })
        expect(email).toBeNull()
    })
})