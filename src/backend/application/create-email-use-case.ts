import { CERTIFICATE_STATUS } from '../domain/certificate'
import { Email, PROCESSING_STATUS_ENUM } from '../domain/email'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { IDataSetsRepository } from './interfaces/idata-sets-repository'
import { IEmailsRepository } from './interfaces/iemails-repository'
import { IExternalProcessing } from './interfaces/iexternal-processing'
import { ISessionsRepository } from './interfaces/isessions-repository'

export interface CreateEmailUseCaseInput {
    sessionToken: string
    certificateEmissionId: string
    subject: string
    body: string
    emailColumn: string
    scheduledAt: Date | null
}

export class CreateEmailUseCase {
    constructor(
        private sessionsRepository: Pick<ISessionsRepository, 'getById'>,
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private dataSetsRepository: Pick<
            IDataSetsRepository,
            'getByCertificateEmissionId'
        >,
        private emailsRepository: Pick<IEmailsRepository, 'save'>,
        private externalProcessing: Pick<
            IExternalProcessing,
            'triggerSendCertificateEmails'
        >,
    ) {}

    async execute(data: CreateEmailUseCaseInput) {
        const session = await this.sessionsRepository.getById(data.sessionToken)

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        const certificateEmission =
            await this.certificateEmissionsRepository.getById(
                data.certificateEmissionId,
            )

        if (!certificateEmission) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        const dataSet =
            await this.dataSetsRepository.getByCertificateEmissionId(
                data.certificateEmissionId,
            )

        if (!dataSet) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SET)
        }

        if (!certificateEmission.hasDataSource()) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        if (data.scheduledAt && !dataSet.hasRows()) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.NO_DATA_SET_ROWS)
        }

        if (!certificateEmission.hasDataSourceColumn(data.emailColumn)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNEXISTENT_DATA_SOURCE_COLUMN,
            )
        }

        const recipients = dataSet.getRowsFromColumn(data.emailColumn)

        if (!Email.validateEmailColumnRecords(recipients)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.INVALID_RECIPIENT_EMAIL,
            )
        }

        const email = Email.create({
            certificateEmissionId: data.certificateEmissionId,
            subject: data.subject,
            body: data.body,
            emailColumn: data.emailColumn,
            scheduledAt: data.scheduledAt,
            emailErrorType: null,
        })

        const { subject, body } = email.serialize()

        if (email.getScheduledAt()) {
            // TODO: implement scheduling logic

            certificateEmission.setStatus(CERTIFICATE_STATUS.SCHEDULED)
        } else {
            await this.externalProcessing.triggerSendCertificateEmails({
                certificateEmissionId: data.certificateEmissionId,
                emailId: email.getId(),
                sender: 'Gerenciador de Certificados',
                subject: subject!,
                body: body!,
                recipients,
            })

            certificateEmission.setStatus(CERTIFICATE_STATUS.PUBLISHED)
        }

        email.setProcessingStatus(PROCESSING_STATUS_ENUM.RUNNING)

        // TODO: add transaction
        await this.emailsRepository.save(email)

        await this.certificateEmissionsRepository.update(certificateEmission)
    }
}
