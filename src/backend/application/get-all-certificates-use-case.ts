import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { prisma } from '../infrastructure/repository/prisma'
import { SessionsRepository } from './interfaces/sessions-repository'

interface GetAllCertificatesUseCaseInput {
    sessionToken: string
    // userId: string
}

export class GetAllCertificatesUseCase {
    constructor(private sessionsRepository: SessionsRepository) {}

    async execute({ sessionToken }: GetAllCertificatesUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new UnauthorizedError('Session not found')
        }

        return await prisma.certification.findMany({
            where: {
                user_id: session.userId,
            },
        })
    }
}
