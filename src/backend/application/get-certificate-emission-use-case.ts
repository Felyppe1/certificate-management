import { CERTIFICATE_STATUS } from '../domain/certificate'
import { GENERATION_STATUS } from '../domain/data-set'
import { DATA_SOURCE_FILE_EXTENSION } from '../domain/data-source'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { INPUT_METHOD } from '../domain/certificate'
import { TEMPLATE_FILE_EXTENSION } from '../domain/template'
import { prisma } from '../infrastructure/repository/prisma'
import { EMAIL_ERROR_TYPE_ENUM, PROCESSING_STATUS_ENUM } from '../domain/email'

interface GetCertificateEmissionUseCaseInput {
    certificateId: string
    userId: string
}

export class GetCertificateEmissionUseCase {
    constructor() {}

    async execute({
        certificateId,
        userId,
    }: GetCertificateEmissionUseCaseInput) {
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
                            DataSet: true,
                        },
                    },
                    Email: true,
                },
            },
        )
        if (!certificateEmission) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificateEmission.user_id !== userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
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
                      dataSet: {
                          id: certificateEmission.DataSource.DataSet!.id,
                          rows: certificateEmission.DataSource.DataSet!
                              .rows as Record<string, any>[],
                          totalBytes:
                              certificateEmission.DataSource.DataSet!
                                  .total_bytes,
                          generationStatus: certificateEmission.DataSource
                              .DataSet!.generation_status as GENERATION_STATUS,
                      },
                  }
                : null,
            email: certificateEmission.Email
                ? {
                      subject: certificateEmission.Email!.subject!,
                      body: certificateEmission.Email!.body!,
                      scheduledAt: certificateEmission.Email!.scheduled_at,
                      emailColumn: certificateEmission.Email!.email_column!,
                      emailErrorType: certificateEmission.Email!
                          .email_error_type as EMAIL_ERROR_TYPE_ENUM | null,
                      status: certificateEmission.Email!
                          .status as PROCESSING_STATUS_ENUM,
                  }
                : null,
        }

        return certificate
    }
}
