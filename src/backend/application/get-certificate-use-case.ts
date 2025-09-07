import { ForbiddenError } from '../domain/error/forbidden-error'
import { NotFoundError } from '../domain/error/not-found-error'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { prisma } from '../infrastructure/repository/prisma'
import { SessionsRepository } from './interfaces/sessions-repository'

interface GetCertificateUseCaseInput {
    certificateId: string
    sessionToken: string
}

export class GetCertificateUseCase {
    constructor(private sessionsRepository: SessionsRepository) {}

    async execute({ certificateId, sessionToken }: GetCertificateUseCaseInput) {
        console.log(sessionToken)
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new UnauthorizedError('Unauthorized')
        }

        const certificate = await prisma.certification.findUnique({
            where: {
                id: certificateId,
            },
            include: {
                Template: true,
            },
        })

        if (!certificate) {
            throw new NotFoundError('Certificate not found')
        }

        console.log(certificate.user_id, session.userId)
        if (certificate.user_id !== session.userId) {
            throw new ForbiddenError(
                'You do not have permission to view this certificate',
            )
        }

        return {
            id: certificate.id,
            title: certificate.title,
            userId: certificate.user_id,
            template: certificate.Template
                ? {
                      id: certificate.Template.id,
                      fileId: certificate.Template.file_id,
                      bucketUrl: certificate.Template.bucket_url,
                      type: certificate.Template.type,
                  }
                : null,
        }
    }
}
