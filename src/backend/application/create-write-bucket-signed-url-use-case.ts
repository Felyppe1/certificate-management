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
import { TEMPLATE_FILE_MIME_TYPE } from '../domain/template'

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
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        const extension =
            input.mimeType === TEMPLATE_FILE_MIME_TYPE.PPTX ? 'pptx' : 'docx'

        // TODO: it's not this path
        const path = `users/${input.userId}/certificates/${certificateEmission.getId()}/original.${extension}`

        const signedUrl = await this.bucket.generateSignedUrl({
            bucketName: process.env.CERTIFICATES_BUCKET!,
            filePath: path,
            mimeType: input.mimeType,
            action: 'write',
        })

        return signedUrl
    }
}
