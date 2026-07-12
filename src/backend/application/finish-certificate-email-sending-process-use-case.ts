import { EMAIL_ERROR_TYPE_ENUM, PROCESSING_STATUS_ENUM } from '../domain/email'
import { EmailNotFoundError } from '../domain/error/not-found-error/email-not-found-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { IEmailsRepository } from './interfaces/repository/write/iemails-repository'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'

interface FinishCertificateEmailSendingProcessUseCaseInput {
    emailId: string
    status: PROCESSING_STATUS_ENUM.COMPLETED | PROCESSING_STATUS_ENUM.FAILED
    emailsSentCount?: number
    userId?: string
}

export class FinishCertificateEmailSendingProcessUseCase {
    constructor(
        private emailsRepository: Pick<IEmailsRepository, 'getById' | 'update'>,
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private usersRepository: Pick<IUsersRepository, 'upsertDailyUsage'>,
        private transactionManager: Pick<ITransactionManager, 'run'>,
    ) {}

    async execute(input: FinishCertificateEmailSendingProcessUseCaseInput) {
        const { emailId, status, emailsSentCount, userId } = input

        const email = await this.emailsRepository.getById(emailId)

        if (!email) {
            throw new EmailNotFoundError()
        }

        const certificateEmissionId = email.getCertificateEmissionId()

        const certificateEmission =
            await this.certificateEmissionsRepository.getById(
                certificateEmissionId,
            )

        if (!certificateEmission) {
            throw new CertificateNotFoundError()
        }

        email.setProcessingStatus(status)

        if (status === PROCESSING_STATUS_ENUM.FAILED) {
            email.setEmailErrorType(EMAIL_ERROR_TYPE_ENUM.INTERNAL_ERROR)
            certificateEmission.markAsGenerated()
        }

        await this.transactionManager.run(async () => {
            if (status === PROCESSING_STATUS_ENUM.COMPLETED && userId) {
                await this.usersRepository.upsertDailyUsage(userId, {
                    emailsSentCount,
                })
            }

            if (status === PROCESSING_STATUS_ENUM.FAILED) {
                await this.certificateEmissionsRepository.update(
                    certificateEmission,
                )
            }

            await this.emailsRepository.update(email)
        })
    }
}
