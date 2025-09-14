import { TemplatesRepository } from '@/backend/application/interfaces/templates-repository'
import {
    INPUT_METHOD,
    Template,
    TEMPLATE_FILE_EXTENSION,
} from '@/backend/domain/template'
import { prisma } from '.'

export class PrismaTemplatesRepository implements TemplatesRepository {
    async save(template: Template) {
        const serialized = template.serialize()

        await prisma.template.create({
            data: {
                id: serialized.id,
                user_id: serialized.userId,
                drive_file_id: serialized.driveFileId,
                storage_file_url: serialized.storageFileUrl,
                input_method: serialized.inputMethod,
                file_name: serialized.fileName,
                file_extension: serialized.fileExtension,
                TemplateVariable: {
                    createMany: {
                        data: serialized.variables.map(variable => ({
                            name: variable,
                        })),
                    },
                },
            },
        })
    }

    async getById(id: string) {
        const template = await prisma.template.findUnique({
            where: { id },
            include: { TemplateVariable: true },
        })

        if (!template) {
            return null
        }

        return new Template({
            id: template.id,
            userId: template.user_id,
            driveFileId: template.drive_file_id,
            storageFileUrl: template.storage_file_url,
            inputMethod: template.input_method as INPUT_METHOD,
            fileName: template.file_name,
            fileExtension: template.file_extension as TEMPLATE_FILE_EXTENSION,
            variables: template.TemplateVariable.map(variable => variable.name),
        })
    }

    async deleteById(id: string) {
        await prisma.template.delete({
            where: { id },
        })
    }

    async update(template: Template) {
        const serialized = template.serialize()

        await prisma.template.update({
            where: { id: serialized.id },
            data: {
                drive_file_id: serialized.driveFileId,
                storage_file_url: serialized.storageFileUrl,
                input_method: serialized.inputMethod,
                file_name: serialized.fileName,
                file_extension: serialized.fileExtension,
                TemplateVariable: {
                    deleteMany: {},
                    createMany: {
                        data: serialized.variables.map(variable => ({
                            name: variable,
                        })),
                    },
                },
            },
        })
    }
}
