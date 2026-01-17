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

interface ViewCertificateUseCaseInput {
    userId: string
    rowId: string
}

export class ViewCertificateUseCase {
    constructor(
        private bucket: Pick<IBucket, 'generateSignedUrl'>,
        private certificateRepository: Pick<ICertificatesRepository, 'getById'>,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'getById'
        >,
    ) {}

    async execute(input: ViewCertificateUseCaseInput) {
        const dataSourceRow = await this.dataSourceRowsRepository.getById(
            input.rowId,
        )

        if (!dataSourceRow) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE_ROW)
        }

        const certificate = await this.certificateRepository.getById(
            dataSourceRow.getCertificateEmissionId(),
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.getUserId() !== input.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }
        // TODO: handle error

        const bucketName = process.env.CERTIFICATES_BUCKET!

        const filePath = `users/${input.userId}/certificates/${certificate.getId()}/certificate-${dataSourceRow.getId()}.pdf`

        const signedUrl = await this.bucket.generateSignedUrl({
            bucketName,
            filePath,
            action: 'read',
        })

        return signedUrl
    }
}
