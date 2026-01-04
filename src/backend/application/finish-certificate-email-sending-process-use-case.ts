import { CERTIFICATE_STATUS } from '../domain/certificate'
import { EMAIL_ERROR_TYPE_ENUM, PROCESSING_STATUS_ENUM } from '../domain/email'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSetsRepository } from './interfaces/repository/idata-sets-repository'
import { IEmailsRepository } from './interfaces/repository/iemails-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'

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
        private dataSetsRepository: Pick<
            IDataSetsRepository,
            'getByCertificateEmissionId'
        >,
        private transactionManager: ITransactionManager,
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

        const dataSet =
            await this.dataSetsRepository.getByCertificateEmissionId(
                certificateEmission.getId(),
            )

        if (!dataSet) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SET)
        }

        const rowsCount = dataSet.getRowsCount()

        email.setProcessingStatus(status, rowsCount)

        if (status === PROCESSING_STATUS_ENUM.COMPLETED) {
            certificateEmission.setStatus(CERTIFICATE_STATUS.PUBLISHED)
        } else {
            email.setEmailErrorType(EMAIL_ERROR_TYPE_ENUM.INTERNAL_ERROR)
            certificateEmission.setStatus(CERTIFICATE_STATUS.DRAFT)
        }

        await this.transactionManager.run(async () => {
            if (status === PROCESSING_STATUS_ENUM.COMPLETED) {
                await this.certificateEmissionsRepository.update(
                    certificateEmission,
                )
            }

            await this.emailsRepository.update(email)
        })
    }
}
