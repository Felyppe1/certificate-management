import { CERTIFICATE_STATUS } from '../domain/certificate'
import { ForbiddenError } from '../domain/error/forbidden-error'
import { NotFoundError } from '../domain/error/not-found-error'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { prisma } from '../infrastructure/repository/prisma'
import { SessionsRepository } from './interfaces/sessions-repository'

interface GetCertificateEmissionUseCaseInput {
    certificateId: string
    sessionToken: string
}

export class GetCertificateEmissionUseCase {
    constructor(private sessionsRepository: SessionsRepository) {}

    async execute({
        certificateId,
        sessionToken,
    }: GetCertificateEmissionUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new UnauthorizedError('Unauthorized')
        }

        const certificateEmission = await prisma.certificateEmission.findUnique(
            {
                where: {
                    id: certificateId,
                },
                include: {
                    Template: {
                        include: {
                            TemplateVariable: true,
                        },
                    },
                },
            },
        )

        if (!certificateEmission) {
            throw new NotFoundError('Certificate not found')
        }

        if (certificateEmission.user_id !== session.userId) {
            throw new ForbiddenError(
                'You do not have permission to view this certificate emission',
            )
        }

        return {
            id: certificateEmission.id,
            name: certificateEmission.title,
            userId: certificateEmission.user_id,
            status: certificateEmission.status as CERTIFICATE_STATUS,
            createdAt: certificateEmission.created_at,
            template: certificateEmission.Template
                ? {
                      id: certificateEmission.Template.id,
                      driveFileId: certificateEmission.Template.drive_file_id,
                      storageFileUrl:
                          certificateEmission.Template.storage_file_url,
                      inputMethod: certificateEmission.Template.input_method,
                      fileName: certificateEmission.Template.file_name,
                      fileExtension:
                          certificateEmission.Template.file_extension,
                      variables:
                          certificateEmission.Template.TemplateVariable.map(
                              variable => variable.name,
                          ),
                  }
                : null,
        }
    }
}
