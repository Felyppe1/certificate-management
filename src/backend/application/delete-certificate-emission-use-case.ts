import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { env } from '@/env'

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
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(userId)) {
            throw new NotCertificateOwnerError()
        }

        if (certificateEmission.isEmitted()) {
            throw new CertificateEmittedError()
        }

        const templateStorageFileUrl = certificateEmission.hasTemplate()
            ? certificateEmission.getTemplateStorageFileUrl()
            : null
        const dataSourceStorageFileUrls =
            certificateEmission.getDataSourceStorageFileUrls()

        await this.certificateEmissionsRepository.delete(
            certificateEmission.getId(),
        )

        if (templateStorageFileUrl) {
            await this.bucket.deleteObject({
                bucketName: env.CERTIFICATES_BUCKET,
                objectName: templateStorageFileUrl,
            })
        }

        await Promise.all(
            dataSourceStorageFileUrls.map(url =>
                this.bucket.deleteObject({
                    bucketName: env.CERTIFICATES_BUCKET,
                    objectName: url,
                }),
            ),
        )
    }
}
