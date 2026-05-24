import { CERTIFICATE_STATUS } from '../domain/certificate'
import { Email, PROCESSING_STATUS_ENUM } from '../domain/email'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { NoDataSourceRowsError } from '../domain/error/validation-error/no-data-source-rows-error'
import { UnexistentDataSourceColumnError } from '../domain/error/validation-error/unexistent-data-source-column-error'
import { InvalidRecipientEmailError } from '../domain/error/validation-error/invalid-recipient-email-error'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsReadRepository } from './interfaces/repository/idata-source-rows-read-repository'
import { IEmailsRepository } from './interfaces/repository/iemails-repository'
import { IQueue } from './interfaces/cloud/iqueue'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'

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
        private transactionManager: Pick<ITransactionManager, 'run'>,
    ) {}

    async execute(data: CreateEmailUseCaseInput) {
        const certificateEmission =
            await this.certificateEmissionsRepository.getById(
                data.certificateEmissionId,
            )

        if (!certificateEmission) {
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(data.userId)) {
            throw new NotCertificateOwnerError()
        }

        if (certificateEmission.isEmitted()) {
            throw new CertificateEmittedError()
        }

        const rowsCount =
            await this.dataSourceRowsReadRepository.countByCertificateEmissionId(
                data.certificateEmissionId,
            )

        // TODO: check if certificates were generated

        if (!certificateEmission.hasDataSource()) {
            throw new DataSourceNotFoundError()
        }

        if (data.scheduledAt && rowsCount === 0) {
            throw new NoDataSourceRowsError()
        }

        if (!certificateEmission.hasDataSourceColumn(data.emailColumn)) {
            throw new UnexistentDataSourceColumnError()
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
            throw new InvalidRecipientEmailError()
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

            certificateEmission.markAsScheduled()
        } else {
            await this.queue.enqueueSendCertificateEmails({
                certificateEmissionId: data.certificateEmissionId,
                emailId: email.getId(),
                userId: data.userId,
                subject: subject!,
                body: body!,
                recipients,
            })

            certificateEmission.markAsEmitted()
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
