import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { env } from '@/env'

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
        const certificateEmission =
            await this.certificateEmissionsRepository.getById(certificateId)

        if (!certificateEmission) {
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(userId)) {
            throw new NotCertificateOwnerError()
        }

        if (certificateEmission.isEmitted()) {
            throw new CertificateEmittedError()
        }

        const storageFileUrls =
            certificateEmission.getDataSourceStorageFileUrls()

        certificateEmission.removeDataSource(userId)

        await this.certificateEmissionsRepository.update(certificateEmission)

        await Promise.all(
            storageFileUrls.map(url =>
                // TODO: do this on outbox pattern?
                this.bucket.deleteObject({
                    bucketName: env.CERTIFICATES_BUCKET,
                    objectName: url,
                }),
            ),
        )
    }
}
