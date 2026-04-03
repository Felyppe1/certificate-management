import { EMAIL_ERROR_TYPE_ENUM, PROCESSING_STATUS_ENUM } from '../domain/email'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IEmailsRepository } from './interfaces/repository/iemails-repository'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
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
            'checkIfExistsById'
        >,
        private usersRepository: Pick<IUsersRepository, 'upsertDailyUsage'>,
        private transactionManager: ITransactionManager,
    ) {}

    async execute(input: FinishCertificateEmailSendingProcessUseCaseInput) {
        const { emailId, status, emailsSentCount, userId } = input

        const email = await this.emailsRepository.getById(emailId)

        if (!email) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.EMAIL)
        }

        const certificateEmissionId = email.getCertificateEmissionId()

        const certificateExists =
            await this.certificateEmissionsRepository.checkIfExistsById(
                certificateEmissionId,
            )

        if (!certificateExists) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        email.setProcessingStatus(status)

        if (status === PROCESSING_STATUS_ENUM.FAILED) {
            email.setEmailErrorType(EMAIL_ERROR_TYPE_ENUM.INTERNAL_ERROR)
        }

        await this.transactionManager.run(async () => {
            if (status === PROCESSING_STATUS_ENUM.COMPLETED && userId) {
                await this.usersRepository.upsertDailyUsage(userId, {
                    emailsSentCount,
                })
            }

            await this.emailsRepository.update(email)
        })
    }
}
