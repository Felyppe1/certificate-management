import { IBucket } from './interfaces/ibucket'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import { NotFoundError } from '../domain/error/not-found-error'
import { ForbiddenError } from '../domain/error/forbidden-error'
import { TEMPLATE_FILE_EXTENSION } from '../domain/template'

interface CreateWriteBucketSignedUrlUseCaseInput {
    sessionToken: string
    certificateId: string
    fileName: string
    mimeType: TEMPLATE_FILE_EXTENSION.PPTX | TEMPLATE_FILE_EXTENSION.DOCX
    type: 'TEMPLATE'
}

export class CreateWriteBucketSignedUrlUseCase {
    constructor(
        private bucket: IBucket,
        private certificateRepository: ICertificatesRepository,
        private sessionsRepository: ISessionsRepository,
    ) {}

    async execute(input: CreateWriteBucketSignedUrlUseCaseInput) {
        const session = await this.sessionsRepository.getById(
            input.sessionToken,
        )

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        const certificate = await this.certificateRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError('Certificate not found')
        }

        if (certificate.getUserId() !== session.userId) {
            throw new ForbiddenError('Forbidden')
        }
        // if (!certificate.hasTemplate()) {
        //     throw new ValidationError('Certificate does not have a template')
        // }

        const extension =
            input.mimeType === TEMPLATE_FILE_EXTENSION.PPTX ? 'pptx' : 'docx'

        const path = `users/${session.userId}/templates/${certificate.getTemplateId()}/original.${extension}`

        const signedUrl = await this.bucket.generateSignedUrl({
            bucketName: process.env.CERTIFICATES_BUCKET!,
            filePath: path,
            mimeType: input.mimeType,
            action: 'write',
        })

        return signedUrl
    }
}
