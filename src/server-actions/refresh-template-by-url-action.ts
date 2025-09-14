'use server'

import { RefreshTemplateByUrlUseCase } from '@/backend/application/refresh-template-by-url-use-case'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import { HttpGoogleDriveGateway } from '@/backend/infrastructure/gateway/http-google-drive-gateway'
import { PrismaTemplatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-templates-repository'
import { RedisSessionsRepository } from '@/backend/infrastructure/repository/redis/redis-sessions-repository'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z, { ZodError } from 'zod'

const refreshTemplateByUrlActionSchema = z.object({
    templateId: z.string().min(1, 'ID do certificado é obrigatório'),
})

export async function refreshTemplateByUrlAction(
    _: unknown,
    formData: FormData,
) {
    const cookie = await cookies()

    const rawData = {
        templateId: formData.get('templateId') as string,
    }

    try {
        const sessionToken = cookie.get('session_token')!.value

        const parsedData = refreshTemplateByUrlActionSchema.parse(rawData)

        const sessionsRepository = new RedisSessionsRepository()
        const templatesRepository = new PrismaTemplatesRepository()
        const googleDriveGateway = new HttpGoogleDriveGateway()
        const fileContentExtractorFactory = new FileContentExtractorFactory()

        const refreshTemplateByUrlUseCase = new RefreshTemplateByUrlUseCase(
            templatesRepository,
            sessionsRepository,
            googleDriveGateway,
            fileContentExtractorFactory,
        )

        await refreshTemplateByUrlUseCase.execute({
            sessionToken,
            templateId: parsedData.templateId,
        })

        revalidateTag('template')

        return {
            success: true,
        }
    } catch (error) {
        console.error(error)
        return {
            success: false,
            message: 'Erro ao adicionar template',
        }
        // if (error instanceof ZodError) {

        // }
    }
}
