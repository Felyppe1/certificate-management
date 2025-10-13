import { NotFoundError } from '../domain/error/not-found-error'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { IBucket } from './interfaces/ibucket'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { ISessionsRepository } from './interfaces/isessions-repository'

interface DeleteTemplateUseCaseInput {
    certificateId: string
    sessionToken: string
}

export class DeleteTemplateUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private sessionsRepository: Pick<ISessionsRepository, 'getById'>,
        private bucket: Pick<IBucket, 'deleteObject'>,
    ) {}

    async execute({ certificateId, sessionToken }: DeleteTemplateUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new UnauthorizedError('session-not-found')
        }

        const certificate =
            await this.certificateEmissionsRepository.getById(certificateId)

        if (!certificate) {
            throw new NotFoundError('Certificate not found')
        }

        const storageFileUrl = certificate.getTemplateStorageFileUrl()!

        certificate.removeTemplate(session.userId)

        if (storageFileUrl) {
            // TODO: do this on outbox pattern?
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: storageFileUrl,
            })
        }

        await this.certificateEmissionsRepository.update(certificate)
    }
}
