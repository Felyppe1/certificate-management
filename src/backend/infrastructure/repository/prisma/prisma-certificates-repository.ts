import { ICertificatesRepository } from '@/backend/application/interfaces/repository/icertificates-repository'
import {
    Certificate,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '@/backend/domain/certificate'
import { COLUMN_TYPE, Prisma } from './client/client'
import { Template, TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'
import {
    DATA_SOURCE_FILE_EXTENSION,
    DataSource,
} from '@/backend/domain/data-source'
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
        const now = new Date()

        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startOfNextMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1,
        )

        const startOfLastMonth = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1,
        )
        const endOfLastMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            0,
            23,
            59,
            59,
            999,
        )

        const execute = async (tx: Prisma.TransactionClient) => {
            const [
                totalCertificatesGenerated,
                totalEmailsSent,
                totalCertificatesGeneratedThisMonth,
                totalEmailsSentThisMonth,
                totalCertificatesGeneratedLastMonth,
                totalEmailsSentLastMonth,
            ] = await Promise.all([
                // Total certificates generation of the user
                tx.certificateGenerationHistory.aggregate({
                    _sum: { quantity: true },
                    where: {
                        CertificateEmission: {
                            user_id: userId,
                        },
                    },
                }),

                // Total emails sent by the user
                tx.emailGenerationHistory.aggregate({
                    _sum: { quantity: true },
                    where: {
                        Email: {
                            CertificateEmission: {
                                user_id: userId,
                            },
                        },
                    },
                }),

                // Certificates generated this month
                tx.certificateGenerationHistory.aggregate({
                    _sum: { quantity: true },
                    where: {
                        created_at: {
                            gte: startOfThisMonth,
                            lt: startOfNextMonth,
                        },
                        CertificateEmission: {
                            user_id: userId,
                        },
                    },
                }),

                // Emails sent this month
                tx.emailGenerationHistory.aggregate({
                    _sum: { quantity: true },
                    where: {
                        created_at: {
                            gte: startOfThisMonth,
                            lt: startOfNextMonth,
                        },
                        Email: {
                            CertificateEmission: {
                                user_id: userId,
                            },
                        },
                    },
                }),

                // Certificates generated last month
                tx.certificateGenerationHistory.aggregate({
                    _sum: { quantity: true },
                    where: {
                        created_at: {
                            gte: startOfLastMonth,
                            lte: endOfLastMonth,
                        },
                        CertificateEmission: {
                            user_id: userId,
                        },
                    },
                }),

                // Emails sent last month
                tx.emailGenerationHistory.aggregate({
                    _sum: { quantity: true },
                    where: {
                        created_at: {
                            gte: startOfLastMonth,
                            lte: endOfLastMonth,
                        },
                        Email: {
                            CertificateEmission: {
                                user_id: userId,
                            },
                        },
                    },
                }),
            ])

            return {
                totalCertificatesGenerated:
                    totalCertificatesGenerated._sum.quantity ?? 0,

                totalEmailsSent: totalEmailsSent._sum.quantity ?? 0,

                totalCertificatesGeneratedThisMonth:
                    totalCertificatesGeneratedThisMonth._sum.quantity ?? 0,

                totalEmailsSentThisMonth:
                    totalEmailsSentThisMonth._sum.quantity ?? 0,

                totalCertificatesGeneratedLastMonth:
                    totalCertificatesGeneratedLastMonth._sum.quantity ?? 0,

                totalEmailsSentLastMonth:
                    totalEmailsSentLastMonth._sum.quantity ?? 0,
            }
        }

        if (isPrismaClient(this.prisma)) {
            return await this.prisma.$transaction(execute)
        } else {
            return await execute(this.prisma)
        }
    }

    async save(certificate: Certificate) {
        const {
            id,
            name,
            status,
            createdAt,
            userId,
            template,
            dataSource,
            variableColumnMapping,
            domainEvents,
        } = certificate.serialize()

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
                                drive_file_id: dataSource.driveFileId,
                                storage_file_url: dataSource.storageFileUrl,
                                input_method: dataSource.inputMethod,
                                file_name: dataSource.fileName,
                                file_extension: dataSource.fileExtension,
                                thumbnail_url: dataSource.thumbnailUrl,
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
                                file_extension: template.fileExtension,
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
        //                         file_extension: dataSource.fileExtension,
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
        //                         file_extension: template.fileExtension,
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

    async update(certificate: Certificate) {
        const {
            id,
            name,
            status,
            template,
            dataSource,
            variableColumnMapping,
            domainEvents,
        } = certificate.serialize()

        const previousCertificate =
            await this.prisma.certificateEmission.findUnique({
                where: { id },
                include: {
                    Template: true,
                    DataSource: true,
                },
            })

        const execute = async (tx: TransactionClient) => {
            if (!template && previousCertificate?.Template) {
                await tx.template.delete({
                    where: { certificate_emission_id: previousCertificate.id },
                })
            }

            if (!dataSource && previousCertificate?.DataSource) {
                await tx.dataSource.delete({
                    where: { certificate_emission_id: previousCertificate.id },
                })
            }

            // First, update/create DataSource and DataSourceColumns
            // This must happen BEFORE creating TemplateVariables that reference them
            if (dataSource) {
                await tx.dataSource.upsert({
                    where: { certificate_emission_id: id },
                    create: {
                        certificate_emission_id: id,
                        drive_file_id: dataSource.driveFileId,
                        storage_file_url: dataSource.storageFileUrl,
                        input_method: dataSource.inputMethod,
                        file_name: dataSource.fileName,
                        file_extension: dataSource.fileExtension,
                        thumbnail_url: dataSource.thumbnailUrl,
                    },
                    update: {
                        drive_file_id: dataSource.driveFileId,
                        storage_file_url: dataSource.storageFileUrl,
                        file_name: dataSource.fileName,
                        input_method: dataSource.inputMethod,
                        file_extension: dataSource.fileExtension,
                        thumbnail_url: dataSource.thumbnailUrl,
                    },
                })

                // Now upsert the DataSourceColumns before creating TemplateVariables
                await Promise.all(
                    dataSource.columns.map(column => {
                        return tx.dataSourceColumn.upsert({
                            where: {
                                name_data_source_id: {
                                    data_source_id: id,
                                    name: column.name,
                                },
                            },
                            update: {
                                type: COLUMN_TYPE_TO_SQL_MAPPER[column.type],
                                array_separator:
                                    column.arrayMetadata?.separator ?? null,
                            },
                            create: {
                                data_source_id: id,
                                name: column.name,
                                type: COLUMN_TYPE_TO_SQL_MAPPER[column.type],
                                array_separator:
                                    column.arrayMetadata?.separator ?? null,
                            },
                        })
                    }),
                )
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
                                    file_extension: template.fileExtension,
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
                                    file_extension: template.fileExtension,
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
        //                             file_extension: dataSource.fileExtension,
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
        //                             file_extension: dataSource.fileExtension,
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
        //                             file_extension: template.fileExtension,
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
        //                             file_extension: template.fileExtension,
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

    async getById(id: string): Promise<Certificate | null> {
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
                  fileExtension: certificate.Template
                      .file_extension as TEMPLATE_FILE_EXTENSION,
                  variables: certificate.Template.TemplateVariable.map(
                      variable => variable.name,
                  ),
                  thumbnailUrl: certificate.Template.thumbnail_url,
              })
            : null

        const dataSource = certificate.DataSource
            ? new DataSource({
                  driveFileId: certificate.DataSource.drive_file_id,
                  storageFileUrl: certificate.DataSource.storage_file_url,
                  inputMethod: certificate.DataSource
                      .input_method as INPUT_METHOD,
                  fileName: certificate.DataSource.file_name,
                  fileExtension: certificate.DataSource
                      .file_extension as DATA_SOURCE_FILE_EXTENSION,
                  columns: certificate.DataSource.DataSourceColumn.map(
                      column => ({
                          name: column.name,
                          type: COLUMN_TYPE_TO_OBJECT_MAPPER[column.type],
                          arrayMetadata: column.array_separator
                              ? {
                                    separator: column.array_separator,
                                }
                              : null,
                      }),
                  ),
                  columnsRow: 1,
                  dataRowStart: 2,
                  thumbnailUrl: certificate.DataSource.thumbnail_url,
              })
            : null

        return new Certificate({
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
