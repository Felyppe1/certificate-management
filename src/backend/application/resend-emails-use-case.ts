import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'
import { EmailNotFoundError } from '../domain/error/not-found-error/email-not-found-error'
import { CertificateNotEmittedError } from '../domain/error/validation-error/certificate-not-emitted-error'
import { UnexistentDataSourceColumnError } from '../domain/error/validation-error/unexistent-data-source-column-error'
import { DataSourceRowsNotFoundError } from '../domain/error/validation-error/data-source-rows-not-found-error'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { IDataSourceRowsReadRepository } from './interfaces/repository/read/idata-source-rows-read-repository'
import { IEmailsRepository } from './interfaces/repository/write/iemails-repository'
import { IQueue } from './interfaces/messaging/iqueue'
import { Email } from '../domain/email'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'

export interface ResendEmailsUseCaseInput {
    userId: string
    certificateEmissionId: string
    rowIds: string[]
}

export class ResendEmailsUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById'
        >,
        private dataSourceRowsReadRepository: Pick<
            IDataSourceRowsReadRepository,
            'getManyByCertificateEmissionId'
        >,
        private emailsRepository: Pick<
            IEmailsRepository,
            'getByCertificateEmissionId'
        >,
        private queue: Pick<IQueue, 'enqueueSendCertificateEmails'>,
    ) {}

    async execute(data: ResendEmailsUseCaseInput) {
        if (data.rowIds.length === 0) {
            return
        }

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

        if (!certificateEmission.isEmitted()) {
            throw new CertificateNotEmittedError()
        }

        if (!certificateEmission.hasDataSource()) {
            throw new DataSourceNotFoundError()
        }

        const email = await this.emailsRepository.getByCertificateEmissionId(
            data.certificateEmissionId,
        )

        if (!email) {
            throw new EmailNotFoundError()
        }

        const emailColumn = email.getEmailColumn()

        if (!certificateEmission.hasDataSourceColumn(emailColumn)) {
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

        const selectedRowIds = new Set(data.rowIds)
        const selectedRows = rows.filter(row => selectedRowIds.has(row.id))

        if (selectedRows.length !== data.rowIds.length) {
            throw new DataSourceRowsNotFoundError()
        }

        const recipients = selectedRows.map(row => ({
            rowId: row.id,
            email: row.data[emailColumn],
        }))

        const { subject, body } = email.serialize()

        await this.queue.enqueueSendCertificateEmails({
            certificateEmissionId: data.certificateEmissionId,
            emailId: email.getId(),
            userId: data.userId,
            subject: subject!,
            body: body!,
            recipients,
        })
    }
}
