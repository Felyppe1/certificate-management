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

interface DeleteCertificateEmissionUseCaseInput {
    certificateId: string
    userId: string
}

export class DeleteCertificateEmissionUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'delete'
        >,
        private bucket: Pick<IBucket, 'deleteObject'>,
    ) {}

    async execute({
        certificateId,
        userId,
    }: DeleteCertificateEmissionUseCaseInput): Promise<void> {
        const certificateEmission =
            await this.certificateEmissionsRepository.getById(certificateId)

        if (!certificateEmission) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (!certificateEmission.isOwner(userId)) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (certificateEmission.isEmitted()) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.CERTIFICATE_EMITTED)
        }

        const templateStorageFileUrl =
            certificateEmission.getTemplateStorageFileUrl()
        const dataSourceStorageFileUrl =
            certificateEmission.getDataSourceStorageFileUrl()

        await this.certificateEmissionsRepository.delete(
            certificateEmission.getId(),
        )

        if (templateStorageFileUrl) {
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: templateStorageFileUrl,
            })
        }

        if (dataSourceStorageFileUrl) {
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: dataSourceStorageFileUrl,
            })
        }
    }
}
