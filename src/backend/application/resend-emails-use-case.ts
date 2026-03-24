import {
    NotFoundError,
    NOT_FOUND_ERROR_TYPE,
} from '../domain/error/not-found-error'
import {
    ValidationError,
    VALIDATION_ERROR_TYPE,
} from '../domain/error/validation-error'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsReadRepository } from './interfaces/repository/idata-source-rows-read-repository'
import { IEmailsRepository } from './interfaces/repository/iemails-repository'
import { IQueue } from './interfaces/cloud/iqueue'
import { Email } from '../domain/email'

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
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (!certificateEmission.isEmitted()) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.CERTIFICATE_NOT_EMITTED,
            )
        }

        if (!certificateEmission.hasDataSource()) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        const email = await this.emailsRepository.getByCertificateEmissionId(
            data.certificateEmissionId,
        )

        if (!email) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.EMAIL)
        }

        const emailColumn = email.getEmailColumn()

        if (!certificateEmission.hasDataSourceColumn(emailColumn)) {
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

        const selectedRowIds = new Set(data.rowIds)
        const selectedRows = rows.filter(row => selectedRowIds.has(row.id))

        if (selectedRows.length !== data.rowIds.length) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_ROWS_NOT_FOUND,
            )
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
            sender: 'Gerenciador de Certificados',
            subject: subject!,
            body: body!,
            recipients,
        })
    }
}
