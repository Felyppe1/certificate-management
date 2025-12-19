import { IBucket } from './interfaces/ibucket'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'

interface DownloadTemplateUseCaseInput {
    sessionToken: string
    certificateEmissionId: string
}

export class DownloadTemplateUseCase {
    constructor(
        private bucket: Pick<IBucket, 'generateSignedUrl'>,
        private certificateRepository: Pick<ICertificatesRepository, 'getById'>,
        private sessionsRepository: Pick<ISessionsRepository, 'getById'>,
    ) {}

    async execute(input: DownloadTemplateUseCaseInput) {
        const session = await this.sessionsRepository.getById(
            input.sessionToken,
        )

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        const certificate = await this.certificateRepository.getById(
            input.certificateEmissionId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.getUserId() !== session.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        const templateStorageFileUrl = certificate.getTemplateStorageFileUrl()

        if (!templateStorageFileUrl) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.TEMPLATE)
        }

        const bucketName = process.env.CERTIFICATES_BUCKET!

        const signedUrl = await this.bucket.generateSignedUrl({
            bucketName,
            filePath: templateStorageFileUrl,
            action: 'read',
        })

        return signedUrl
    }
}
