import { IBucket } from './interfaces/storage/ibucket'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { env } from '@/env'

interface CreateWriteBucketSignedUrlUseCaseInput {
    userId: string
    certificateId: string
    fileName: string
    mimeType: TEMPLATE_FILE_MIME_TYPE.PPTX | TEMPLATE_FILE_MIME_TYPE.DOCX
    type: 'TEMPLATE'
}

export class CreateWriteBucketSignedUrlUseCase {
    constructor(
        private bucket: Pick<IBucket, 'generateSignedUrl'>,
        private certificateRepository: Pick<ICertificatesRepository, 'getById'>,
    ) {}

    async execute(input: CreateWriteBucketSignedUrlUseCaseInput) {
        const certificateEmission = await this.certificateRepository.getById(
            input.certificateId,
        )

        if (!certificateEmission) {
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new NotCertificateOwnerError()
        }

        const extension =
            input.mimeType === TEMPLATE_FILE_MIME_TYPE.PPTX ? 'pptx' : 'docx'

        // TODO: it's not this path
        const path = `users/${input.userId}/certificates/${certificateEmission.getId()}/original.${extension}`

        const signedUrl = await this.bucket.generateSignedUrl({
            bucketName: env.CERTIFICATES_BUCKET,
            filePath: path,
            mimeType: input.mimeType,
            action: 'write',
        })

        return signedUrl
    }
}
