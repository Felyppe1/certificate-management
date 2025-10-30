import { AuthenticationError } from '../domain/error/authentication-error'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { prisma } from '../infrastructure/repository/prisma'
import { CERTIFICATE_STATUS } from '../domain/certificate'
import { GENERATION_STATUS } from '../domain/data-set'
import { DATA_SOURCE_FILE_EXTENSION } from '../domain/data-source'
import { INPUT_METHOD, TEMPLATE_FILE_EXTENSION } from '../domain/template'

interface GenerateCertificatesUseCaseInput {
    certificateEmissionId: string
    sessionToken: string
}

export class GenerateCertificatesUseCase {
    constructor(private sessionsRepository: ISessionsRepository) {}

    async execute({
        certificateEmissionId,
        sessionToken,
    }: GenerateCertificatesUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        const certificateEmission = await prisma.certificateEmission.findUnique(
            {
                where: {
                    id: certificateEmissionId,
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
                            DataSet: true,
                        },
                    },
                },
            },
        )

        if (!certificateEmission) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificateEmission.user_id !== session.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (!certificateEmission.Template) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.TEMPLATE)
        }

        if (!certificateEmission.DataSource) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        if (!certificateEmission.DataSource.DataSet) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SET)
        }

        const certificateData = {
            certificateEmission: {
                id: certificateEmission.id,
                name: certificateEmission.title,
                userId: certificateEmission.user_id,
                status: certificateEmission.status as CERTIFICATE_STATUS,
                createdAt: certificateEmission.created_at,
                variableColumnMapping:
                    certificateEmission.Template.TemplateVariable.reduce(
                        (acc, templateVariable) => {
                            acc[templateVariable.name] =
                                templateVariable.data_source_name
                            return acc
                        },
                        {} as Record<string, string | null>,
                    ),
                template: {
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
                },
                dataSource: {
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
                    thumbnailUrl: certificateEmission.DataSource.thumbnail_url,
                    dataSet: {
                        id: certificateEmission.DataSource.DataSet.id,
                        rows: certificateEmission.DataSource.DataSet.rows,
                        generationStatus: certificateEmission.DataSource.DataSet
                            .generation_status as GENERATION_STATUS,
                    },
                },
            },
        }

        const cloudFunctionUrl = process.env.CLOUD_FUNCTION_BASE_URL

        if (!cloudFunctionUrl) {
            throw new Error('CLOUD_FUNCTION_BASE_URL not configured')
        }

        const response = await fetch(cloudFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(certificateData),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(
                `Cloud function failed: ${errorData.error || response.statusText}`,
            )
        }
    }
}
