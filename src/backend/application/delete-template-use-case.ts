import { NotFoundError } from '../domain/error/not-found-error'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
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

        certificate.removeTemplate(session.userId)

        await this.certificateEmissionsRepository.update(certificate)
    }
}
