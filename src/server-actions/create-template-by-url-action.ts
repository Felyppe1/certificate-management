'use server'

import { CreateTemplateByUrlUseCase } from '@/backend/application/create-template-by-url-use-case'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import { HttpGoogleDriveGateway } from '@/backend/infrastructure/gateway/http-google-drive-gateway'
import { PrismaTemplatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-templates-repository'
import { RedisSessionsRepository } from '@/backend/infrastructure/repository/redis/redis-sessions-repository'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import z, { ZodError } from 'zod'

const createTemplateByUrlActionSchema = z.object({
    fileUrl: z.url('URL do arquivo inválida'),
})

export async function createTemplateByUrlAction(
    _: unknown,
    formData: FormData,
) {
    const cookie = await cookies()

    const rawData = {
        fileUrl: formData.get('fileUrl') as string,
    }

    let newTemplateId: string

    try {
        const sessionToken = cookie.get('session_token')!.value

        const parsedData = createTemplateByUrlActionSchema.parse(rawData)

        const sessionsRepository = new RedisSessionsRepository()
        const templatesRepository = new PrismaTemplatesRepository()
        const googleDriveGateway = new HttpGoogleDriveGateway()
        const fileContentExtractorFactory = new FileContentExtractorFactory()

        const addTemplateByUrlUseCase = new CreateTemplateByUrlUseCase(
            templatesRepository,
            sessionsRepository,
            googleDriveGateway,
            fileContentExtractorFactory,
        )

        newTemplateId = await addTemplateByUrlUseCase.execute({
            fileUrl: parsedData.fileUrl,
            sessionToken,
        })

        revalidateTag('templates')
    } catch (error) {
        console.error(error)
        return {
            success: false,
            message: 'Erro ao adicionar template',
        }
        // if (error instanceof ZodError) {

        // }
    }

    redirect('/templates/' + newTemplateId)
}
