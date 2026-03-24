import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { PROCESSING_STATUS_ENUM } from '../domain/data-source-row'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'

interface DownloadCertificateEmissionUseCaseInput {
    userId: string
    rowId: string
}

export class DownloadCertificateEmissionUseCase {
    constructor(
        private bucket: Pick<IBucket, 'generateSignedUrl'>,
        private certificateRepository: Pick<ICertificatesRepository, 'getById'>,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'getById'
        >,
    ) {}

    async execute(input: DownloadCertificateEmissionUseCaseInput) {
        const row = await this.dataSourceRowsRepository.getById(input.rowId)

        if (!row) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE_ROW)
        }

        const certificate = await this.certificateRepository.getById(
            row.getCertificateEmissionId(),
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.isOwner(input.userId)) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (row.getProcessingStatus() !== PROCESSING_STATUS_ENUM.COMPLETED) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.CERTIFICATE_NOT_GENERATED,
            )
        }

        const bucketName = process.env.CERTIFICATES_BUCKET!

        const filePath = `users/${input.userId}/certificates/${certificate.getId()}/certificate-${input.rowId}.pdf`

        const signedUrl = await this.bucket.generateSignedUrl({
            bucketName,
            filePath,
            action: 'read',
        })

        return signedUrl
    }
}
