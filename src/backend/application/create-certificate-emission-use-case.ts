import { Certificate } from '../domain/certificate'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { CertificatesRepository } from './interfaces/certificates-repository'
import { SessionsRepository } from './interfaces/sessions-repository'

interface CreateUseCaseEmissionUseCaseInput {
    name: string
    sessionToken: string
}

export class CreateCertificateEmissionUseCase {
    constructor(
        private certificateEmissionsRepository: CertificatesRepository,
        private sessionsRepository: SessionsRepository,
    ) {}

    async execute({ name, sessionToken }: CreateUseCaseEmissionUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new UnauthorizedError('Session not found')
        }

        const newCertificate = Certificate.create({
            name,
            userId: session.userId,
            template: null,
        })

        await this.certificateEmissionsRepository.save(newCertificate)

        return newCertificate.getId()
    }
}
