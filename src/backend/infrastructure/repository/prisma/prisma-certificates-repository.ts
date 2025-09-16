import { CertificatesRepository } from '@/backend/application/interfaces/certificates-repository'
import { Certificate } from '@/backend/domain/certificate'
import { prisma } from '.'
import {
    INPUT_METHOD,
    Template,
    TEMPLATE_FILE_EXTENSION,
} from '@/backend/domain/template'

export class PrismaCertificatesRepository implements CertificatesRepository {
    async save(certificate: Certificate) {
        const { id, name, userId, template, domainEvents } =
            certificate.serialize()

        await prisma.$transaction([
            prisma.certificateEmission.create({
                data: {
                    id,
                    title: name,
                    user_id: userId,
                    ...(template && {
                        Template: {
                            create: {
                                id: template.id,
                                drive_file_id: template.driveFileId,
                                storage_file_url: template.storageFileUrl,
                                input_method: template.inputMethod,
                                file_name: template.fileName,
                                file_extension: template.fileExtension,
                                TemplateVariable: {
                                    createMany: {
                                        data: template.variables.map(
                                            variable => ({
                                                name: variable,
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
        const { id, name, template, domainEvents } = certificate.serialize()

        if (!template) {
            const certificate = await prisma.certificateEmission.findUnique({
                where: { id },
                include: {
                    Template: {
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
        }

        await prisma.$transaction([
            prisma.certificateEmission.update({
                where: { id },
                data: {
                    title: name,
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
                                    TemplateVariable: {
                                        createMany: {
                                            data: template.variables.map(
                                                variable => ({
                                                    name: variable,
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
                                    TemplateVariable: {
                                        deleteMany: {},
                                        createMany: {
                                            data: template.variables.map(
                                                variable => ({
                                                    name: variable,
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
              })
            : null

        return new Certificate({
            id: certificate.id,
            name: certificate.title,
            userId: certificate.user_id,
            template: template,
        })
    }
}
