import { CERTIFICATE_STATUS } from '../domain/certificate'
import { EMAIL_ERROR_TYPE_ENUM, PROCESSING_STATUS_ENUM } from '../domain/email'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { IEmailsRepository } from './interfaces/iemails-repository'

interface FinishCertificateEmailSendingProcessUseCaseInput {
    emailId: string
    status: PROCESSING_STATUS_ENUM.COMPLETED | PROCESSING_STATUS_ENUM.FAILED
}

export class FinishCertificateEmailSendingProcessUseCase {
    constructor(
        private emailsRepository: Pick<IEmailsRepository, 'getById' | 'update'>,
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
    ) {}

    async execute(input: FinishCertificateEmailSendingProcessUseCaseInput) {
        const { emailId, status } = input

        const email = await this.emailsRepository.getById(emailId)

        if (!email) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.EMAIL)
        }

        const certificateEmission =
            await this.certificateEmissionsRepository.getById(
                email.getCertificateEmissionId(),
            )

        if (!certificateEmission) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        email.setProcessingStatus(status)

        if (status === PROCESSING_STATUS_ENUM.COMPLETED) {
            certificateEmission.setStatus(CERTIFICATE_STATUS.PUBLISHED)

            await this.certificateEmissionsRepository.update(
                certificateEmission,
            )
        } else {
            email.setEmailErrorType(EMAIL_ERROR_TYPE_ENUM.INTERNAL_ERROR)
        }

        await this.emailsRepository.update(email)
    }
}
