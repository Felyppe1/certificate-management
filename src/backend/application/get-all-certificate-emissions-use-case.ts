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
                user_id: session.userId,
            },
        })

        return certificateEmissions.map(certificate => ({
            id: certificate.id,
            name: certificate.title,
            userId: certificate.user_id,
            status: certificate.status,
            createdAt: certificate.created_at,
        }))
    }
}
