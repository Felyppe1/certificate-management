import { Certificate } from '../domain/certificate'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { ISessionsRepository } from './interfaces/isessions-repository'

interface CreateUseCaseEmissionUseCaseInput {
    name: string
    sessionToken: string
}

export class CreateCertificateEmissionUseCase {
    constructor(
        private certificateEmissionsRepository: ICertificatesRepository,
        private sessionsRepository: ISessionsRepository,
    ) {}

    async execute({ name, sessionToken }: CreateUseCaseEmissionUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new UnauthorizedError('session-not-found')
        }

        const newCertificate = Certificate.create({
            name,
            userId: session.userId,
            template: null,
            dataSource: null,
        })

        await this.certificateEmissionsRepository.save(newCertificate)

        return newCertificate.getId()
    }
}
