import { CERTIFICATE_STATUS } from '../domain/certificate'
import { AuthenticationError } from '../domain/error/authentication-error'
import { prisma } from '../infrastructure/repository/prisma'
import { ISessionsRepository } from './interfaces/repository/isessions-repository'

interface GetAllCertificateEmissionsUseCaseInput {
    sessionToken: string
    // userId: string
}

export class GetAllCertificateEmissionsUseCase {
    constructor(private sessionsRepository: ISessionsRepository) {}

    async execute({ sessionToken }: GetAllCertificateEmissionsUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        const certificateEmissions = await prisma.certificateEmission.findMany({
            where: {
                user_id: session.userId,
            },
            orderBy: {
                created_at: 'desc',
            },
        })

        return certificateEmissions.map(certificate => ({
            id: certificate.id,
            name: certificate.title,
            userId: certificate.user_id,
            status: certificate.status as CERTIFICATE_STATUS,
            createdAt: certificate.created_at,
        }))
    }
}
