import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'

interface DeleteDataSourceUseCaseInput {
    certificateId: string
    userId: string
}

export class DeleteDataSourceUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private bucket: Pick<IBucket, 'deleteObject'>,
    ) {}

    async execute({ certificateId, userId }: DeleteDataSourceUseCaseInput) {
        const certificate =
            await this.certificateEmissionsRepository.getById(certificateId)

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.isOwner(userId)) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (certificate.isEmitted()) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.CERTIFICATE_EMITTED)
        }

        const storageFileUrl = certificate.getDataSourceStorageFileUrl()

        certificate.removeDataSource(userId)

        await this.certificateEmissionsRepository.update(certificate)

        if (storageFileUrl) {
            // TODO: do this on outbox pattern?
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: storageFileUrl,
            })
        }
    }
}
