import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { prisma } from '../infrastructure/repository/prisma'
import { SessionsRepository } from './interfaces/sessions-repository'

interface GetAllCertificateEmissionsUseCaseInput {
    sessionToken: string
    // userId: string
}

export class GetAllCertificateEmissionsUseCase {
    constructor(private sessionsRepository: SessionsRepository) {}

    async execute({ sessionToken }: GetAllCertificateEmissionsUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new UnauthorizedError('Session not found')
        }

        const certificateEmissions = await prisma.certificateEmission.findMany({
            where: {
                Template: {
                    user_id: session.userId,
                },
            },
        })

        return certificateEmissions
    }
}
