import { CERTIFICATE_STATUS } from '../domain/certificate'
import { Email, PROCESSING_STATUS_ENUM } from '../domain/email'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsReadRepository } from './interfaces/repository/idata-source-rows-read-repository'
import { IEmailsRepository } from './interfaces/repository/iemails-repository'
import { IQueue } from './interfaces/cloud/iqueue'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'

export interface CreateEmailUseCaseInput {
    userId: string
    certificateEmissionId: string
    subject: string
    body: string
    emailColumn: string
    scheduledAt: Date | null
}

export class CreateEmailUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private dataSourceRowsReadRepository: Pick<
            IDataSourceRowsReadRepository,
            'countByCertificateEmissionId' | 'getManyByCertificateEmissionId'
        >,
        private emailsRepository: Pick<IEmailsRepository, 'save'>,
        private queue: Pick<IQueue, 'enqueueSendCertificateEmails'>,
        private transactionManager: ITransactionManager,
    ) {}

    async execute(data: CreateEmailUseCaseInput) {
        const certificateEmission =
            await this.certificateEmissionsRepository.getById(
                data.certificateEmissionId,
            )

        if (!certificateEmission) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        const rowsCount =
            await this.dataSourceRowsReadRepository.countByCertificateEmissionId(
                data.certificateEmissionId,
            )

        // TODO: check if certificates were generated

        if (!certificateEmission.hasDataSource()) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        if (data.scheduledAt && rowsCount === 0) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.NO_DATA_SOURCE_ROWS)
        }

        if (!certificateEmission.hasDataSourceColumn(data.emailColumn)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNEXISTENT_DATA_SOURCE_COLUMN,
            )
        }

        const rows: { id: string; data: Record<string, string> }[] = []
        let cursor: string | undefined

        do {
            const { data: fetchedRows, nextCursor } =
                await this.dataSourceRowsReadRepository.getManyByCertificateEmissionId(
                    data.certificateEmissionId,
                    undefined,
                    cursor,
                )

            rows.push(...fetchedRows)
            cursor = nextCursor || undefined
        } while (cursor)

        const emailValues = rows.map(row => row.data[data.emailColumn])
        if (!Email.validateEmailColumnRecords(emailValues)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.INVALID_RECIPIENT_EMAIL,
            )
        }

        const recipients = rows.map(row => ({
            rowId: row.id,
            email: row.data[data.emailColumn],
        }))

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
            await this.queue.enqueueSendCertificateEmails({
                certificateEmissionId: data.certificateEmissionId,
                emailId: email.getId(),
                userId: data.userId,
                sender: 'Gerenciador de Certificados',
                subject: subject!,
                body: body!,
                recipients,
            })

            certificateEmission.setStatus(CERTIFICATE_STATUS.PUBLISHED)
        }

        email.setProcessingStatus(PROCESSING_STATUS_ENUM.RUNNING)

        await this.transactionManager.run(async () => {
            await this.emailsRepository.save(email)

            await this.certificateEmissionsRepository.update(
                certificateEmission,
            )
        })
    }
}
