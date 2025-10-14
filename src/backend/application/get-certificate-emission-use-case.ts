import { CERTIFICATE_STATUS } from '../domain/certificate'
import { DATA_SOURCE_FILE_EXTENSION } from '../domain/data-source'
import { ForbiddenError } from '../domain/error/forbidden-error'
import { NotFoundError } from '../domain/error/not-found-error'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { INPUT_METHOD, TEMPLATE_FILE_EXTENSION } from '../domain/template'
import { prisma } from '../infrastructure/repository/prisma'
import { ISessionsRepository } from './interfaces/isessions-repository'

interface GetCertificateEmissionUseCaseInput {
    certificateId: string
    sessionToken: string
}

export class GetCertificateEmissionUseCase {
    constructor(private sessionsRepository: ISessionsRepository) {}

    async execute({
        certificateId,
        sessionToken,
    }: GetCertificateEmissionUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new UnauthorizedError('session-not-found')
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
                    DataSource: {
                        include: {
                            DataSourceColumn: true,
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

        const certificate = {
            id: certificateEmission.id,
            name: certificateEmission.title,
            userId: certificateEmission.user_id,
            status: certificateEmission.status as CERTIFICATE_STATUS,
            createdAt: certificateEmission.created_at,
            variableColumnMapping:
                certificateEmission.Template?.TemplateVariable.reduce(
                    (acc, templateVariable) => {
                        acc[templateVariable.name] =
                            templateVariable.data_source_name
                        return acc
                    },
                    {} as Record<string, string | null>,
                ) ?? null,
            template: certificateEmission.Template
                ? {
                      id: certificateEmission.Template.id,
                      driveFileId: certificateEmission.Template.drive_file_id,
                      storageFileUrl:
                          certificateEmission.Template.storage_file_url,
                      inputMethod: certificateEmission.Template
                          .input_method as INPUT_METHOD,
                      fileName: certificateEmission.Template.file_name,
                      fileExtension: certificateEmission.Template
                          .file_extension as TEMPLATE_FILE_EXTENSION,
                      variables:
                          certificateEmission.Template.TemplateVariable.map(
                              variable => variable.name,
                          ),
                      thumbnailUrl: certificateEmission.Template.thumbnail_url,
                  }
                : null,
            dataSource: certificateEmission.DataSource
                ? {
                      id: certificateEmission.DataSource.id,
                      driveFileId: certificateEmission.DataSource.drive_file_id,
                      storageFileUrl:
                          certificateEmission.DataSource.storage_file_url,
                      inputMethod: certificateEmission.DataSource
                          .input_method as INPUT_METHOD,
                      fileName: certificateEmission.DataSource.file_name,
                      fileExtension: certificateEmission.DataSource
                          .file_extension as DATA_SOURCE_FILE_EXTENSION,
                      columns:
                          certificateEmission.DataSource.DataSourceColumn.map(
                              column => column.name,
                          ),
                      thumbnailUrl:
                          certificateEmission.DataSource.thumbnail_url,
                  }
                : null,
        }

        console.log(certificate)

        return certificate
    }
}
