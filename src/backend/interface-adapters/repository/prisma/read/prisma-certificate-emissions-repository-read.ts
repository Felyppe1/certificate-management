import { ICertificateEmissionsReadRepository } from '@/backend/application/interfaces/repository/read/icertificate-emissions-read-repository'
import { CERTIFICATE_STATUS, INPUT_METHOD } from '@/backend/domain/certificate'
import { DATA_SOURCE_MIME_TYPE } from '@/backend/domain/data-source'
import { TEMPLATE_FILE_MIME_TYPE } from '@/backend/domain/template'
import { ColumnType } from '@/backend/domain/data-source-column'
import {
    EMAIL_ERROR_TYPE_ENUM,
    PROCESSING_STATUS_ENUM,
} from '@/backend/domain/email'
import { PROCESSING_STATUS_ENUM as DATA_SOURCE_ROW_PROCESSING_STATUS_ENUM } from '@/backend/domain/data-source-row'
import { getCertificateEmissionsMetricsByUserId } from '@/backend/infrastructure/repository/prisma/client/sql'
import { PrismaRepository } from '../prisma-repository'

export class PrismaCertificateEmissionsRepositoryRead
    extends PrismaRepository
    implements ICertificateEmissionsReadRepository
{
    async getCertificateEmissionsMetricsByUserId(userId: string) {
        type DailyItem = { date: string; quantity: number }

        const [row] = await this.prisma.$queryRawTyped(
            getCertificateEmissionsMetricsByUserId(userId),
        )

        const dailyCertificates = (row.daily_certificates ?? []) as DailyItem[]
        const dailyEmails = (row.daily_emails ?? []) as DailyItem[]

        return {
            totalCertificatesGenerated: row.certificates_total ?? 0,
            totalEmailsSent: row.emails_total ?? 0,
            dailyCertificates: dailyCertificates.map(item => ({
                date: new Date(item.date),
                quantity: item.quantity,
            })),
            dailyEmails: dailyEmails.map(item => ({
                date: new Date(item.date),
                quantity: item.quantity,
            })),
        }
    }

    async listByOwner(userId: string) {
        const certificateEmissions =
            await this.prisma.certificateEmission.findMany({
                where: {
                    user_id: userId,
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

    async getDetailsById(certificateId: string) {
        const certificateEmission =
            await this.prisma.certificateEmission.findUnique({
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
                            DataSourceFile: {
                                orderBy: { file_index: 'asc' },
                            },
                            DataSourceColumn: {
                                include: {
                                    DataSourceValue: {
                                        orderBy: {
                                            DataSourceRow: {
                                                source_row_index: 'asc',
                                            },
                                        },
                                        include: {
                                            DataSourceRow: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    Email: true,
                },
            })
        if (!certificateEmission) {
            return null
        }

        let rows: {
            id: string
            processingStatus: DATA_SOURCE_ROW_PROCESSING_STATUS_ENUM
            fileBytes: number | null
            data: Record<string, string>
        }[] = []

        if (certificateEmission.DataSource) {
            // Aggregate rows from DataSourceColumn -> DataSourceValue -> DataSourceRow
            const rowsMap = new Map<
                string,
                {
                    id: string
                    processingStatus: string
                    fileBytes: number | null
                    data: Record<string, string>
                }
            >()

            for (const column of certificateEmission.DataSource
                .DataSourceColumn) {
                for (const value of column.DataSourceValue) {
                    const row = value.DataSourceRow
                    if (!rowsMap.has(row.id)) {
                        rowsMap.set(row.id, {
                            id: row.id,
                            processingStatus: row.processing_status,
                            fileBytes: row.file_bytes,
                            data: {},
                        })
                    }
                    rowsMap.get(row.id)!.data[column.name] = value.value
                }
            }

            rows = Array.from(rowsMap.values()).map(row => ({
                id: row.id,
                processingStatus:
                    row.processingStatus as DATA_SOURCE_ROW_PROCESSING_STATUS_ENUM,
                fileBytes: row.fileBytes,
                data: row.data,
            }))
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
                      fileMimeType: certificateEmission.Template
                          .file_extension as TEMPLATE_FILE_MIME_TYPE,
                      variables:
                          certificateEmission.Template.TemplateVariable.map(
                              variable => variable.name,
                          ),
                      thumbnailUrl: certificateEmission.Template.thumbnail_url,
                      googleAccountEmail:
                          certificateEmission.Template.google_account_email,
                  }
                : null,
            dataSource: certificateEmission.DataSource
                ? {
                      files: certificateEmission.DataSource.DataSourceFile.map(
                          f => ({
                              fileName: f.file_name,
                              driveFileId: f.drive_file_id,
                              storageFileUrl: f.storage_file_url,
                          }),
                      ),
                      inputMethod: certificateEmission.DataSource
                          .input_method as INPUT_METHOD,
                      fileMimeType: certificateEmission.DataSource
                          .file_extension as DATA_SOURCE_MIME_TYPE,
                      columns:
                          certificateEmission.DataSource.DataSourceColumn.map(
                              column => ({
                                  name: column.name,
                                  type: column.type.toLowerCase() as ColumnType,
                                  arraySeparator: column.array_separator,
                                  arrayItemType: column.array_item_type
                                      ? column.array_item_type.toLowerCase()
                                      : null,
                              }),
                          ),
                      thumbnailUrl:
                          certificateEmission.DataSource.thumbnail_url,
                      googleAccountEmail:
                          certificateEmission.DataSource.google_account_email,
                      rows,
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
