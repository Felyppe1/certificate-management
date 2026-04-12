import { ICertificatesRepository } from '@/backend/application/interfaces/repository/icertificates-repository'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '@/backend/domain/certificate'
import { COLUMN_TYPE, Prisma } from './client/client'
import { Template, TEMPLATE_FILE_MIME_TYPE } from '@/backend/domain/template'
import { DATA_SOURCE_MIME_TYPE, DataSource } from '@/backend/domain/data-source'
import { TransactionClient } from './client/internal/prismaNamespace'
import { isPrismaClient, PrismaExecutor } from '.'
import { transactionStorage } from './prisma-transaction-manager'

const COLUMN_TYPE_TO_SQL_MAPPER = {
    string: COLUMN_TYPE.STRING,
    number: COLUMN_TYPE.NUMBER,
    boolean: COLUMN_TYPE.BOOLEAN,
    date: COLUMN_TYPE.DATE,
    array: COLUMN_TYPE.ARRAY,
}

const COLUMN_TYPE_TO_OBJECT_MAPPER = {
    [COLUMN_TYPE.STRING]: 'string',
    [COLUMN_TYPE.NUMBER]: 'number',
    [COLUMN_TYPE.BOOLEAN]: 'boolean',
    [COLUMN_TYPE.DATE]: 'date',
    [COLUMN_TYPE.ARRAY]: 'array',
} as const

export class PrismaCertificatesRepository implements ICertificatesRepository {
    constructor(private readonly defaultPrisma: PrismaExecutor) {}

    private get prisma() {
        const store = transactionStorage.getStore()
        return store || this.defaultPrisma
    }

    async getCertificateEmissionsMetricsByUserId(userId: string) {
        type DailyItem = { date: string; quantity: number }
        type ResultRow = {
            certificates_total: number
            emails_total: number
            daily_certificates: DailyItem[] | null
            daily_emails: DailyItem[] | null
        }

        const prisma = this.prisma

        const [row] = await prisma.$queryRaw<ResultRow[]>`
            SELECT
                COALESCE(SUM(certificates_generated_count), 0)::int AS certificates_total,
                COALESCE(SUM(emails_sent_count), 0)::int AS emails_total,
                JSON_AGG(
                    JSON_BUILD_OBJECT('date', date, 'quantity', certificates_generated_count)
                    ORDER BY date ASC
                ) FILTER (WHERE date >= CURRENT_DATE - INTERVAL '30 days' AND certificates_generated_count > 0) AS daily_certificates,
                JSON_AGG(
                    JSON_BUILD_OBJECT('date', date, 'quantity', emails_sent_count)
                    ORDER BY date ASC
                ) FILTER (WHERE date >= CURRENT_DATE - INTERVAL '30 days' AND emails_sent_count > 0) AS daily_emails
            FROM daily_usages
            WHERE user_id = ${userId}
        `

        return {
            totalCertificatesGenerated: row.certificates_total,
            totalEmailsSent: row.emails_total,
            dailyCertificates: (row.daily_certificates ?? []).map(item => ({
                date: new Date(item.date),
                quantity: item.quantity,
            })),
            dailyEmails: (row.daily_emails ?? []).map(item => ({
                date: new Date(item.date),
                quantity: item.quantity,
            })),
        }
    }

    async save(certificate: CertificateEmission) {
        const {
            id,
            name,
            status,
            createdAt,
            userId,
            template,
            dataSource,
            variableColumnMapping,
        } = certificate.serialize()

        const domainEvents = certificate.pullDomainEvents()

        const execute = async (tx: Prisma.TransactionClient) => {
            await tx.certificateEmission.create({
                data: {
                    id,
                    title: name,
                    user_id: userId,
                    status,
                    created_at: createdAt,
                    ...(dataSource && {
                        DataSource: {
                            create: {
                                input_method: dataSource.inputMethod,
                                file_extension: dataSource.fileMimeType,
                                thumbnail_url: dataSource.thumbnailUrl,
                                DataSourceFile: {
                                    createMany: {
                                        data: dataSource.files.map(
                                            (file, index) => ({
                                                file_index: index,
                                                file_name: file.fileName,
                                                drive_file_id: file.driveFileId,
                                                storage_file_url:
                                                    file.storageFileUrl,
                                            }),
                                        ),
                                    },
                                },
                                DataSourceColumn: {
                                    createMany: {
                                        data: dataSource.columns.map(
                                            column => ({
                                                name: column.name,
                                                type: COLUMN_TYPE_TO_SQL_MAPPER[
                                                    column.type
                                                ],
                                                array_separator:
                                                    column.arrayMetadata
                                                        ?.separator ?? null,
                                                array_item_type: column
                                                    .arrayMetadata?.itemType
                                                    ? COLUMN_TYPE_TO_SQL_MAPPER[
                                                          column.arrayMetadata
                                                              .itemType
                                                      ]
                                                    : null,
                                            }),
                                        ),
                                    },
                                },
                            },
                        },
                    }),
                    ...(template && {
                        Template: {
                            create: {
                                drive_file_id: template.driveFileId,
                                storage_file_url: template.storageFileUrl,
                                input_method: template.inputMethod,
                                file_name: template.fileName,
                                file_extension: template.fileMimeType,
                                thumbnail_url: template.thumbnailUrl,
                                TemplateVariable: {
                                    createMany: {
                                        data: template.variables.map(
                                            variable => ({
                                                name: variable,
                                                data_source_id:
                                                    variableColumnMapping?.[
                                                        variable
                                                    ]
                                                        ? id
                                                        : null,
                                                data_source_name:
                                                    variableColumnMapping?.[
                                                        variable
                                                    ],
                                            }),
                                        ),
                                    },
                                },
                            },
                        },
                    }),
                },
            })

            await tx.outbox.createMany({
                data: domainEvents.map(event => ({
                    id: event.id,
                    event_type: event.name,
                    created_at: event.ocurredOn,
                    payload: JSON.stringify(event),
                })),
            })
        }

        if (isPrismaClient(this.prisma)) {
            await this.prisma.$transaction(execute)
        } else {
            await execute(this.prisma)
        }
        // await this.prisma.$transaction([
        //     this.prisma.certificateEmission.create({
        //         data: {
        //             id,
        //             title: name,
        //             user_id: userId,
        //             status,
        //             created_at: createdAt,
        //             ...(dataSource && {
        //                 DataSource: {
        //                     create: {
        //                         drive_file_id: dataSource.driveFileId,
        //                         storage_file_url: dataSource.storageFileUrl,
        //                         input_method: dataSource.inputMethod,
        //                         file_name: dataSource.fileName,
        //                         file_extension: dataSource.fileMimeType,
        //                         thumbnail_url: dataSource.thumbnailUrl,
        //                         DataSourceColumn: {
        //                             createMany: {
        //                                 data: dataSource.columns.map(
        //                                     column => ({
        //                                         name: column,
        //                                     }),
        //                                 ),
        //                             },
        //                         },
        //                     },
        //                 },
        //             }),
        //             ...(template && {
        //                 Template: {
        //                     create: {
        //                         drive_file_id: template.driveFileId,
        //                         storage_file_url: template.storageFileUrl,
        //                         input_method: template.inputMethod,
        //                         file_name: template.fileName,
        //                         file_extension: template.fileMimeType,
        //                         thumbnail_url: template.thumbnailUrl,
        //                         TemplateVariable: {
        //                             createMany: {
        //                                 data: template.variables.map(
        //                                     variable => ({
        //                                         name: variable,
        //                                         data_source_id:
        //                                             variableColumnMapping?.[
        //                                                 variable
        //                                             ]
        //                                                 ? id
        //                                                 : null,
        //                                         data_source_name:
        //                                             variableColumnMapping?.[
        //                                                 variable
        //                                             ],
        //                                     }),
        //                                 ),
        //                             },
        //                         },
        //                     },
        //                 },
        //             }),
        //         },
        //     }),

        //     this.prisma.outbox.createMany({
        //         data: domainEvents.map(event => ({
        //             id: event.id,
        //             event_type: event.name,
        //             created_at: event.ocurredOn,
        //             payload: JSON.stringify(event),
        //         })),
        //     }),
        // ])
    }

    async update(certificate: CertificateEmission) {
        const {
            id,
            name,
            status,
            template,
            dataSource,
            variableColumnMapping,
        } = certificate.serialize()

        const domainEvents = certificate.pullDomainEvents()

        const previousCertificate =
            await this.prisma.certificateEmission.findUnique({
                where: { id },
                include: {
                    Template: true,
                    DataSource: {
                        include: {
                            DataSourceColumn: true,
                        },
                    },
                },
            })

        const execute = async (tx: TransactionClient) => {
            const deletePromises = []

            if (!template && previousCertificate?.Template) {
                deletePromises.push(
                    tx.template.delete({
                        where: {
                            certificate_emission_id: previousCertificate.id,
                        },
                    }),
                )
            }

            if (!dataSource && previousCertificate?.DataSource) {
                deletePromises.push(
                    tx.dataSource.delete({
                        where: {
                            certificate_emission_id: previousCertificate.id,
                        },
                    }),
                )
            }

            if (deletePromises.length > 0) {
                await Promise.all(deletePromises)
            }

            // First, update/create DataSource and DataSourceColumns
            // This must happen BEFORE creating TemplateVariables that reference them
            if (dataSource) {
                const columnsToDelete = previousCertificate?.DataSource
                    ? previousCertificate.DataSource.DataSourceColumn.filter(
                          column =>
                              !dataSource.columns.some(
                                  c => c.name === column.name,
                              ),
                      )
                    : []

                await tx.dataSource.upsert({
                    where: { certificate_emission_id: id },
                    create: {
                        certificate_emission_id: id,
                        input_method: dataSource.inputMethod,
                        file_extension: dataSource.fileMimeType,
                        thumbnail_url: dataSource.thumbnailUrl,
                        DataSourceFile: {
                            createMany: {
                                data: dataSource.files.map((file, index) => ({
                                    file_index: index,
                                    file_name: file.fileName,
                                    drive_file_id: file.driveFileId,
                                    storage_file_url: file.storageFileUrl,
                                })),
                            },
                        },
                        DataSourceColumn: {
                            createMany: {
                                data: dataSource.columns.map(column => ({
                                    name: column.name,
                                    type: COLUMN_TYPE_TO_SQL_MAPPER[
                                        column.type
                                    ],
                                    array_separator:
                                        column.arrayMetadata?.separator ?? null,
                                    array_item_type: column.arrayMetadata
                                        ?.itemType
                                        ? COLUMN_TYPE_TO_SQL_MAPPER[
                                              column.arrayMetadata.itemType
                                          ]
                                        : null,
                                })),
                            },
                        },
                    },
                    update: {
                        input_method: dataSource.inputMethod,
                        file_extension: dataSource.fileMimeType,
                        thumbnail_url: dataSource.thumbnailUrl,
                        DataSourceFile: {
                            deleteMany: {},
                            createMany: {
                                data: dataSource.files.map((file, index) => ({
                                    file_index: index,
                                    file_name: file.fileName,
                                    drive_file_id: file.driveFileId,
                                    storage_file_url: file.storageFileUrl,
                                })),
                            },
                        },
                        DataSourceColumn: {
                            upsert: dataSource.columns.map(column => ({
                                where: {
                                    name_data_source_id: {
                                        data_source_id: id,
                                        name: column.name,
                                    },
                                },
                                update: {
                                    type: COLUMN_TYPE_TO_SQL_MAPPER[
                                        column.type
                                    ],
                                    array_separator:
                                        column.arrayMetadata?.separator ?? null,
                                    array_item_type: column.arrayMetadata
                                        ?.itemType
                                        ? COLUMN_TYPE_TO_SQL_MAPPER[
                                              column.arrayMetadata.itemType
                                          ]
                                        : null,
                                },
                                create: {
                                    // data_source_id: id,
                                    name: column.name,
                                    type: COLUMN_TYPE_TO_SQL_MAPPER[
                                        column.type
                                    ],
                                    array_separator:
                                        column.arrayMetadata?.separator ?? null,
                                    array_item_type: column.arrayMetadata
                                        ?.itemType
                                        ? COLUMN_TYPE_TO_SQL_MAPPER[
                                              column.arrayMetadata.itemType
                                          ]
                                        : null,
                                },
                            })),
                            deleteMany: {
                                name: {
                                    in: columnsToDelete.map(
                                        column => column.name,
                                    ),
                                },
                            },
                        },
                    },
                })
            }

            // Now update the certificate emission with Template and TemplateVariables
            // At this point, DataSourceColumns exist, so the foreign key constraint will be satisfied
            await tx.certificateEmission.update({
                where: { id },
                data: {
                    title: name,
                    status,
                    Template: {
                        ...(template && {
                            upsert: {
                                create: {
                                    drive_file_id: template.driveFileId,
                                    storage_file_url: template.storageFileUrl,
                                    input_method: template.inputMethod,
                                    file_name: template.fileName,
                                    file_extension: template.fileMimeType,
                                    thumbnail_url: template.thumbnailUrl,
                                    TemplateVariable: {
                                        createMany: {
                                            data: template.variables.map(
                                                variable => ({
                                                    name: variable,
                                                    data_source_id:
                                                        variableColumnMapping?.[
                                                            variable
                                                        ]
                                                            ? id
                                                            : null,
                                                    data_source_name:
                                                        variableColumnMapping?.[
                                                            variable
                                                        ],
                                                }),
                                            ),
                                        },
                                    },
                                },
                                update: {
                                    drive_file_id: template.driveFileId,
                                    storage_file_url: template.storageFileUrl,
                                    file_name: template.fileName,
                                    input_method: template.inputMethod,
                                    file_extension: template.fileMimeType,
                                    thumbnail_url: template.thumbnailUrl,
                                    TemplateVariable: {
                                        deleteMany: {},
                                        createMany: {
                                            data: template.variables.map(
                                                variable => ({
                                                    name: variable,
                                                    data_source_id:
                                                        variableColumnMapping?.[
                                                            variable
                                                        ]
                                                            ? id
                                                            : null,
                                                    data_source_name:
                                                        variableColumnMapping?.[
                                                            variable
                                                        ],
                                                }),
                                            ),
                                        },
                                    },
                                },
                                // where: { id: template.id }, // TODO: must be the id of the previous template, not the new one
                            },
                        }),
                    },
                },
            })

            await tx.outbox.createMany({
                data: domainEvents.map(event => ({
                    id: event.id,
                    event_type: event.name,
                    created_at: event.ocurredOn,
                    payload: JSON.stringify(event),
                })),
            })
        }

        if (isPrismaClient(this.prisma)) {
            await this.prisma.$transaction(execute)
        } else {
            await execute(this.prisma)
        }
        // await this.prisma.$transaction(async (tx: TransactionClient) => {
        //     if (!template && previousCertificate?.Template) {
        //         await tx.template.delete({
        //             where: { certificate_emission_id: previousCertificate.id },
        //         })
        //     }

        //     if (!dataSource && previousCertificate?.DataSource) {
        //         await tx.dataSource.delete({
        //             where: { certificate_emission_id: previousCertificate.id },
        //         })
        //     }

        //     await tx.certificateEmission.update({
        //         where: { id },
        //         data: {
        //             title: name,
        //             status,
        //             DataSource: {
        //                 ...(dataSource && {
        //                     upsert: {
        //                         create: {
        //                             drive_file_id: dataSource.driveFileId,
        //                             storage_file_url: dataSource.storageFileUrl,
        //                             input_method: dataSource.inputMethod,
        //                             file_name: dataSource.fileName,
        //                             file_extension: dataSource.fileMimeType,
        //                             thumbnail_url: dataSource.thumbnailUrl,
        //                             DataSourceColumn: {
        //                                 createMany: {
        //                                     data: dataSource.columns.map(
        //                                         column => ({
        //                                             name: column,
        //                                         }),
        //                                     ),
        //                                 },
        //                             },
        //                         },
        //                         update: {
        //                             drive_file_id: dataSource.driveFileId,
        //                             storage_file_url: dataSource.storageFileUrl,
        //                             file_name: dataSource.fileName,
        //                             input_method: dataSource.inputMethod,
        //                             file_extension: dataSource.fileMimeType,
        //                             thumbnail_url: dataSource.thumbnailUrl,
        //                             DataSourceColumn: {
        //                                 deleteMany: {},
        //                                 createMany: {
        //                                     data: dataSource.columns.map(
        //                                         column => ({
        //                                             name: column,
        //                                         }),
        //                                     ),
        //                                 },
        //                             },
        //                         },
        //                         // where: { id: template.id }, // TODO: must be the id of the previous template, not the new one
        //                     },
        //                 }),
        //             },
        //             Template: {
        //                 ...(template && {
        //                     upsert: {
        //                         create: {
        //                             drive_file_id: template.driveFileId,
        //                             storage_file_url: template.storageFileUrl,
        //                             input_method: template.inputMethod,
        //                             file_name: template.fileName,
        //                             file_extension: template.fileMimeType,
        //                             thumbnail_url: template.thumbnailUrl,
        //                             TemplateVariable: {
        //                                 createMany: {
        //                                     data: template.variables.map(
        //                                         variable => ({
        //                                             name: variable,
        //                                             data_source_id:
        //                                                 variableColumnMapping?.[
        //                                                     variable
        //                                                 ]
        //                                                     ? id
        //                                                     : null,
        //                                             data_source_name:
        //                                                 variableColumnMapping?.[
        //                                                     variable
        //                                                 ],
        //                                         }),
        //                                     ),
        //                                 },
        //                             },
        //                         },
        //                         update: {
        //                             drive_file_id: template.driveFileId,
        //                             storage_file_url: template.storageFileUrl,
        //                             file_name: template.fileName,
        //                             input_method: template.inputMethod,
        //                             file_extension: template.fileMimeType,
        //                             thumbnail_url: template.thumbnailUrl,
        //                             TemplateVariable: {
        //                                 deleteMany: {},
        //                                 createMany: {
        //                                     data: template.variables.map(
        //                                         variable => ({
        //                                             name: variable,
        //                                             data_source_id:
        //                                                 variableColumnMapping?.[
        //                                                     variable
        //                                                 ]
        //                                                     ? id
        //                                                     : null,
        //                                             data_source_name:
        //                                                 variableColumnMapping?.[
        //                                                     variable
        //                                                 ],
        //                                         }),
        //                                     ),
        //                                 },
        //                             },
        //                         },
        //                         // where: { id: template.id }, // TODO: must be the id of the previous template, not the new one
        //                     },
        //                 }),
        //             },
        //         },
        //     })

        //     await tx.outbox.createMany({
        //         data: domainEvents.map(event => ({
        //             id: event.id,
        //             event_type: event.name,
        //             created_at: event.ocurredOn,
        //             payload: JSON.stringify(event),
        //         })),
        //     })
        // })
    }

    async delete(id: string): Promise<void> {
        const execute = async (tx: TransactionClient) => {
            await tx.certificateEmission.delete({
                where: { id },
            })
        }

        if (isPrismaClient(this.prisma)) {
            await this.prisma.$transaction(execute)
        } else {
            await execute(this.prisma)
        }
    }

    async markAsGeneratedIfNotAlready(id: string): Promise<void> {
        const execute = async (tx: TransactionClient) => {
            await tx.certificateEmission.updateMany({
                where: {
                    id,
                    status: {
                        not: CERTIFICATE_STATUS.GENERATED,
                    },
                },
                data: {
                    status: CERTIFICATE_STATUS.GENERATED,
                },
            })
        }

        if (isPrismaClient(this.prisma)) {
            await this.prisma.$transaction(execute)
        } else {
            await execute(this.prisma)
        }
    }

    async checkIfExistsById(id: string): Promise<boolean> {
        const count = await this.prisma.certificateEmission.count({
            where: { id },
        })
        return count > 0
    }

    async getById(id: string): Promise<CertificateEmission | null> {
        const certificate = await this.prisma.certificateEmission.findUnique({
            where: { id },
            include: {
                Template: {
                    include: {
                        TemplateVariable: true,
                    },
                },
                DataSource: {
                    include: {
                        DataSourceColumn: true,
                        DataSourceFile: {
                            orderBy: { file_index: 'asc' },
                        },
                    },
                },
            },
        })

        if (!certificate) {
            return null
        }

        const template = certificate.Template
            ? new Template({
                  driveFileId: certificate.Template.drive_file_id,
                  storageFileUrl: certificate.Template
                      .storage_file_url as string, // TODO: create a migration after running the script
                  inputMethod: certificate.Template
                      .input_method as INPUT_METHOD,
                  fileName: certificate.Template.file_name,
                  fileMimeType: certificate.Template
                      .file_extension as TEMPLATE_FILE_MIME_TYPE,
                  variables: certificate.Template.TemplateVariable.map(
                      variable => variable.name,
                  ),
                  thumbnailUrl: certificate.Template.thumbnail_url,
              })
            : null

        const dataSource = certificate.DataSource
            ? new DataSource({
                  files: certificate.DataSource.DataSourceFile.map(f => ({
                      fileName: f.file_name,
                      driveFileId: f.drive_file_id,
                      storageFileUrl: f.storage_file_url,
                  })),
                  inputMethod: certificate.DataSource
                      .input_method as INPUT_METHOD,
                  fileMimeType: certificate.DataSource
                      .file_extension as DATA_SOURCE_MIME_TYPE,
                  columns: certificate.DataSource.DataSourceColumn.map(
                      column => ({
                          name: column.name,
                          type: COLUMN_TYPE_TO_OBJECT_MAPPER[column.type],
                          arrayMetadata:
                              column.type === 'ARRAY'
                                  ? {
                                        separator: column.array_separator!,
                                        itemType:
                                            COLUMN_TYPE_TO_OBJECT_MAPPER[
                                                column.array_item_type!
                                            ],
                                    }
                                  : null,
                      }),
                  ),
                  columnsRow: 1,
                  dataRowStart: 2,
                  thumbnailUrl: certificate.DataSource.thumbnail_url,
              })
            : null

        return new CertificateEmission({
            id: certificate.id,
            name: certificate.title,
            userId: certificate.user_id,
            template: template,
            dataSource: dataSource,
            status: certificate.status as CERTIFICATE_STATUS,
            createdAt: certificate.created_at,
            variableColumnMapping:
                certificate.Template?.TemplateVariable.reduce(
                    (acc, templateVariable) => {
                        acc[templateVariable.name] =
                            templateVariable.data_source_name
                        return acc
                    },
                    {} as Record<string, string | null>,
                ) ?? null,
        })
    }
}
