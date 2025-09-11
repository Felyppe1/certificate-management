import { CertificatesRepository } from '@/backend/application/interfaces/certificates-repository'
import { Certificate } from '@/backend/domain/certificate'
import { prisma } from '.'
import { Template, TEMPLATE_TYPE } from '@/backend/domain/template'

export class PrismaCertificatesRepository implements CertificatesRepository {
    async save(certificate: Certificate) {
        const { id, title, userId, template } = certificate.serialize()

        await prisma.certification.create({
            data: {
                id,
                title,
                user_id: userId,
                ...(template && {
                    Template: {
                        create: {
                            id: template.id,
                            file_id: template.fileId,
                            bucket_url: template.bucketUrl,
                            type: template.type,
                            file_name: template.fileName,
                            TemplateVariable: {
                                createMany: {
                                    data: template.variables.map(variable => ({
                                        name: variable,
                                    })),
                                },
                            },
                        },
                    },
                }),
            },
        })
    }

    async update(certificate: Certificate) {
        const { id, title, template } = certificate.serialize()

        await prisma.certification.update({
            where: { id },
            data: {
                title,
                Template: {
                    ...(template && {
                        delete: true,
                        create: {
                            id: template.id,
                            file_id: template.fileId,
                            bucket_url: template.bucketUrl,
                            type: template.type as TEMPLATE_TYPE,
                            file_name: template.fileName,
                            TemplateVariable: {
                                createMany: {
                                    data: template.variables.map(variable => ({
                                        name: variable,
                                    })),
                                },
                            },
                        },
                    }),
                },
            },
        })
        // await prisma.certification.update({
        //     where: { id },
        //     data: {
        //         title,
        //         Template: {
        //             ...(template && {
        //                 upsert: {
        //                     create: {
        //                         id: template.id,
        //                         file_id: template.fileId,
        //                         bucket_url: template.bucketUrl,
        //                         type: template.type as TEMPLATE_TYPE,
        //                         TemplateVariable: {
        //                             createMany: {
        //                                 data: template.variables.map(
        //                                     variable => ({
        //                                         name: variable,
        //                                     }),
        //                                 ),
        //                             },
        //                         },
        //                     },
        //                     update: {
        //                         bucket_url: template.bucketUrl,
        //                         file_id: template.fileId,
        //                         type: template.type as TEMPLATE_TYPE,
        //                     },
        //                     where: { id: template.id }, // TODO: must be the id of the previous template, not the new one
        //                 },
        //             }),
        //         },
        //     },
        // })
    }

    async getById(id: string): Promise<Certificate | null> {
        const certificate = await prisma.certification.findUnique({
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
                  fileId: certificate.Template.file_id,
                  bucketUrl: certificate.Template.bucket_url,
                  type: certificate.Template.type as TEMPLATE_TYPE,
                  fileName: certificate.Template.file_name,
                  variables: certificate.Template.TemplateVariable.map(
                      variable => variable.name,
                  ),
              })
            : null

        return new Certificate({
            id: certificate.id,
            title: certificate.title,
            userId: certificate.user_id,
            template: template,
        })
    }
}
