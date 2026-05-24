import { env } from '@/env'
import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { TemplateNotFoundError } from '../domain/error/not-found-error/template-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'

interface DownloadTemplateUseCaseInput {
    userId: string
    certificateEmissionId: string
}

export class DownloadTemplateUseCase {
    constructor(
        private bucket: Pick<IBucket, 'generateSignedUrl'>,
        private certificateRepository: Pick<ICertificatesRepository, 'getById'>,
    ) {}

    async execute(input: DownloadTemplateUseCaseInput) {
        const certificateEmission = await this.certificateRepository.getById(
            input.certificateEmissionId,
        )

        if (!certificateEmission) {
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new NotCertificateOwnerError()
        }

        if (!certificateEmission.hasTemplate()) {
            throw new TemplateNotFoundError()
        }

        const templateStorageFileUrl =
            certificateEmission.getTemplateStorageFileUrl()

        const bucketName = env.CERTIFICATES_BUCKET

        const signedUrl = await this.bucket.generateSignedUrl({
            bucketName,
            filePath: templateStorageFileUrl,
            action: 'read',
        })

        return signedUrl
    }
}
