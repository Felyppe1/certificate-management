import { IBucket } from './interfaces/ibucket'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'

interface DownloadDataSourceUseCaseInput {
    userId: string
    certificateEmissionId: string
}

export class DownloadDataSourceUseCase {
    constructor(
        private bucket: Pick<IBucket, 'generateSignedUrl'>,
        private certificateRepository: Pick<ICertificatesRepository, 'getById'>,
    ) {}

    async execute(input: DownloadDataSourceUseCaseInput) {
        const certificate = await this.certificateRepository.getById(
            input.certificateEmissionId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.getUserId() !== input.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        const dataSourceStorageFileUrl =
            certificate.getDataSourceStorageFileUrl()

        if (!dataSourceStorageFileUrl) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        const bucketName = process.env.CERTIFICATES_BUCKET!

        const signedUrl = await this.bucket.generateSignedUrl({
            bucketName,
            filePath: dataSourceStorageFileUrl,
            action: 'read',
        })

        return signedUrl
    }
}
