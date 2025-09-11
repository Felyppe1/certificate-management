import { NotFoundError } from '../domain/error/not-found-error'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { CertificatesRepository } from './interfaces/certificates-repository'
import { SessionsRepository } from './interfaces/sessions-repository'

interface DeleteTemplateUseCaseInput {
    certificateId: string
    sessionToken: string
}

export class DeleteTemplateUseCase {
    constructor(
        private certificatesRepository: CertificatesRepository,
        private sessionsRepository: SessionsRepository,
    ) {}

    async execute({ certificateId, sessionToken }: DeleteTemplateUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new UnauthorizedError('Session not found')
        }

        const certificate =
            await this.certificatesRepository.getById(certificateId)

        if (!certificate) {
            throw new NotFoundError('Certificate not found')
        }

        if (certificate.getUserId() !== session.userId) {
            throw new UnauthorizedError(
                'You do not have permission to delete this template',
            )
        }

        if (!certificate.hasTemplate()) return

        certificate.removeTemplate()

        await this.certificatesRepository.update(certificate)
    }
}
