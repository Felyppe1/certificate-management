import { describe, it, expect } from 'vitest'
import { FinishCertificateEmailSendingProcessUseCase } from './finish-certificate-email-sending-process-use-case'
import { PrismaEmailsRepository } from '../interface-adapters/repository/prisma/write/prisma-emails-repository'
import { PrismaCertificatesRepository } from '../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaUsersRepository } from '../interface-adapters/repository/prisma/write/prisma-users-repository'
import { PrismaTransactionManager } from '../interface-adapters/repository/prisma/prisma-transaction-manager'
import { PROCESSING_STATUS_ENUM, EMAIL_ERROR_TYPE_ENUM } from '../domain/email'
import { CERTIFICATE_STATUS, INPUT_METHOD } from '../domain/certificate'
import { prisma } from '@/tests/setup.integration'

describe('FinishCertificateEmailSendingProcessUseCase (Integration)', () => {
    async function createBaseFixture() {
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
                status: CERTIFICATE_STATUS.EMITTED,
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
                            create: [{ name: 'email', type: 'STRING' }],
                        },
                    },
                },
                Email: {
                    create: {
                        id: 'email-1',
                        subject: 'Seu certificado',
                        body: 'Olá!',
                        email_column: 'email',
                        status: PROCESSING_STATUS_ENUM.RUNNING,
                        email_error_type: null,
                        scheduled_at: null,
                    },
                },
            },
        })
    }

    it('deve marcar o envio de email como concluído e registrar uso diário', async () => {
        await createBaseFixture()

        const useCase = new FinishCertificateEmailSendingProcessUseCase(
            new PrismaEmailsRepository(prisma),
            new PrismaCertificatesRepository(prisma),
            new PrismaUsersRepository(prisma),
            new PrismaTransactionManager(prisma),
        )

        await useCase.execute({
            emailId: 'email-1',
            status: PROCESSING_STATUS_ENUM.COMPLETED,
            emailsSentCount: 3,
            userId: '1',
        })

        const email = await prisma.email.findUnique({
            where: { id: 'email-1' },
        })
        expect(email?.status).toBe('COMPLETED')

        const dailyUsage = await prisma.dailyUsage.findFirst({
            where: { user_id: '1' },
        })
        expect(dailyUsage?.emails_sent_count).toBe(3)
    })

    describe('quando o envio falha', () => {
        it('deve marcar o email como falho e reverter o certificado ao estado anterior à emissão', async () => {
            await createBaseFixture()

            const useCase = new FinishCertificateEmailSendingProcessUseCase(
                new PrismaEmailsRepository(prisma),
                new PrismaCertificatesRepository(prisma),
                new PrismaUsersRepository(prisma),
                new PrismaTransactionManager(prisma),
            )

            await useCase.execute({
                emailId: 'email-1',
                status: PROCESSING_STATUS_ENUM.FAILED,
            })

            const email = await prisma.email.findUnique({
                where: { id: 'email-1' },
            })
            expect(email?.status).toBe('FAILED')
            expect(email?.email_error_type).toBe(
                EMAIL_ERROR_TYPE_ENUM.INTERNAL_ERROR,
            )

            const certificate = await prisma.certificateEmission.findUnique({
                where: { id: '1' },
            })
            expect(certificate?.status).toBe('GENERATED')
        })

        it('deve reverter todas as alterações quando a última operação da transação falha', async () => {
            await createBaseFixture()

            const realEmailsRepository = new PrismaEmailsRepository(prisma)

            class EmailsRepositoryThrowingOnUpdate {
                constructor(private readonly real: PrismaEmailsRepository) {}
                async getById(id: string) {
                    return this.real.getById(id)
                }
                async update(): Promise<void> {
                    throw new Error('database failure')
                }
            }

            const useCase = new FinishCertificateEmailSendingProcessUseCase(
                new EmailsRepositoryThrowingOnUpdate(realEmailsRepository),
                new PrismaCertificatesRepository(prisma),
                new PrismaUsersRepository(prisma),
                new PrismaTransactionManager(prisma),
            )

            await expect(
                useCase.execute({
                    emailId: 'email-1',
                    status: PROCESSING_STATUS_ENUM.FAILED,
                }),
            ).rejects.toThrow()

            const certificate = await prisma.certificateEmission.findUnique({
                where: { id: '1' },
            })
            expect(certificate?.status).toBe('EMITTED')
        })
    })
})
