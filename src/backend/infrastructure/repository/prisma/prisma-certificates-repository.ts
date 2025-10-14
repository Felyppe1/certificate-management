import { ICertificatesRepository } from '@/backend/application/interfaces/icertificates-repository'
import { Certificate, CERTIFICATE_STATUS } from '@/backend/domain/certificate'
import { prisma } from '.'
import {
    INPUT_METHOD,
    Template,
    TEMPLATE_FILE_EXTENSION,
} from '@/backend/domain/template'
import {
    DATA_SOURCE_FILE_EXTENSION,
    DataSource,
} from '@/backend/domain/data-source'

export class PrismaCertificatesRepository implements ICertificatesRepository {
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

        await prisma.$transaction([
            prisma.certificateEmission.create({
                data: {
                    id,
                    title: name,
                    user_id: userId,
                    status,
                    created_at: createdAt,
                    ...(dataSource && {
                        DataSource: {
                            create: {
                                id: dataSource.id,
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
                                                name: column,
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
                                id: template.id,
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
                                                        ? dataSource?.id
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
            }),

            prisma.outbox.createMany({
                data: domainEvents.map(event => ({
                    id: event.id,
                    event_type: event.name,
                    created_at: event.ocurredOn,
                    payload: JSON.stringify(event),
                })),
            }),
        ])
    }

    async update(certificate: Certificate) {
        const {
            id,
            name,
            template,
            dataSource,
            variableColumnMapping,
            domainEvents,
        } = certificate.serialize()

        if (!template) {
            const certificate = await prisma.certificateEmission.findUnique({
                where: { id },
                include: {
                    Template: {
                        select: {
                            id: true,
                        },
                    },
                    DataSource: {
                        select: {
                            id: true,
                        },
                    },
                },
            })

            if (certificate?.Template) {
                await prisma.template.delete({
                    where: { id: certificate.Template.id },
                })
            }

            if (certificate?.DataSource) {
                await prisma.dataSource.delete({
                    where: { id: certificate.DataSource.id },
                })
            }
        }

        await prisma.$transaction([
            prisma.certificateEmission.update({
                where: { id },
                data: {
                    title: name,
                    DataSource: {
                        ...(dataSource && {
                            upsert: {
                                create: {
                                    id: dataSource.id,
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
                                                    name: column,
                                                }),
                                            ),
                                        },
                                    },
                                },
                                update: {
                                    drive_file_id: dataSource.driveFileId,
                                    storage_file_url: dataSource.storageFileUrl,
                                    file_name: dataSource.fileName,
                                    input_method: dataSource.inputMethod,
                                    file_extension: dataSource.fileExtension,
                                    thumbnail_url: dataSource.thumbnailUrl,
                                    DataSourceColumn: {
                                        deleteMany: {},
                                        createMany: {
                                            data: dataSource.columns.map(
                                                column => ({
                                                    name: column,
                                                }),
                                            ),
                                        },
                                    },
                                },
                                // where: { id: template.id }, // TODO: must be the id of the previous template, not the new one
                            },
                        }),
                    },
                    Template: {
                        ...(template && {
                            upsert: {
                                create: {
                                    id: template.id,
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
                                                            ? dataSource?.id
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
                                                            ? dataSource?.id
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
            }),

            prisma.outbox.createMany({
                data: domainEvents.map(event => ({
                    id: event.id,
                    event_type: event.name,
                    created_at: event.ocurredOn,
                    payload: JSON.stringify(event),
                })),
            }),
        ])
    }

    async getById(id: string): Promise<Certificate | null> {
        const certificate = await prisma.certificateEmission.findUnique({
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
                  id: certificate.Template.id,
                  driveFileId: certificate.Template.drive_file_id,
                  storageFileUrl: certificate.Template.storage_file_url,
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
                  id: certificate.DataSource.id,
                  driveFileId: certificate.DataSource.drive_file_id,
                  storageFileUrl: certificate.DataSource.storage_file_url,
                  inputMethod: certificate.DataSource
                      .input_method as INPUT_METHOD,
                  fileName: certificate.DataSource.file_name,
                  fileExtension: certificate.DataSource
                      .file_extension as DATA_SOURCE_FILE_EXTENSION,
                  columns: certificate.DataSource.DataSourceColumn.map(
                      column => column.name,
                  ),
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
