import { IEmailsRepository } from '@/backend/application/interfaces/repository/iemails-repository'
import {
    Email,
    EMAIL_ERROR_TYPE_ENUM,
    PROCESSING_STATUS_ENUM,
} from '@/backend/domain/email'
import { PrismaExecutor } from '.'
import { transactionStorage } from './prisma-transaction-manager'

export class PrismaEmailsRepository implements IEmailsRepository {
    constructor(private readonly defaultPrisma: PrismaExecutor) {}

    private get prisma() {
        return transactionStorage.getStore() || this.defaultPrisma
    }

    async save(email: Email) {
        const {
            id,
            certificateEmissionId,
            subject,
            body,
            emailColumn,
            scheduledAt,
            status,
            emailErrorType,
        } = email.serialize()

        await this.prisma.email.create({
            data: {
                id,
                certificate_emission_id: certificateEmissionId,
                subject,
                body,
                scheduled_at: scheduledAt,
                status,
                email_error_type: emailErrorType,
                email_column: emailColumn,
            },
        })
    }

    async update(email: Email): Promise<void> {
        const {
            id,
            subject,
            body,
            emailColumn,
            scheduledAt,
            status,
            emailErrorType,
            quantityEmailsSent,
        } = email.serialize()

        await this.prisma.email.update({
            where: {
                id,
            },
            data: {
                subject,
                body,
                email_column: emailColumn,
                scheduled_at: scheduledAt,
                status,
                email_error_type: emailErrorType,
                ...(status === PROCESSING_STATUS_ENUM.COMPLETED && {
                    EmailGenerationHistory: {
                        create: {
                            quantity: quantityEmailsSent,
                        },
                    },
                }),
            },
        })
    }

    async getById(id: string): Promise<Email | null> {
        const emailRecord = await this.prisma.email.findUnique({
            where: {
                id,
            },
        })

        if (!emailRecord) {
            return null
        }

        return new Email({
            id: emailRecord.id,
            certificateEmissionId: emailRecord.certificate_emission_id,
            subject: emailRecord.subject,
            body: emailRecord.body,
            emailColumn: emailRecord.email_column,
            scheduledAt: emailRecord.scheduled_at,
            status: emailRecord.status as PROCESSING_STATUS_ENUM,
            emailErrorType:
                emailRecord.email_error_type as EMAIL_ERROR_TYPE_ENUM | null,
        })
    }
}
