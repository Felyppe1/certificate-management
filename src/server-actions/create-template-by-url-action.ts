'use server'

import { CreateTemplateByUrlUseCase } from '@/backend/application/create-template-by-url-use-case'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import { HttpGoogleDriveGateway } from '@/backend/infrastructure/gateway/http-google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { RedisSessionsRepository } from '@/backend/infrastructure/repository/redis/redis-sessions-repository'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z, { ZodError } from 'zod'

const createTemplateByUrlActionSchema = z.object({
    certificateId: z.string().min(1, 'ID do certificado é obrigatório'),
    fileUrl: z.url('URL do arquivo inválida'),
})

export async function createTemplateByUrlAction(
    _: unknown,
    formData: FormData,
) {
    const cookie = await cookies()

    const rawData = {
        certificateId: formData.get('certificateId') as string,
        fileUrl: formData.get('fileUrl') as string,
    }

    try {
        const sessionToken = cookie.get('session_token')!.value

        const parsedData = createTemplateByUrlActionSchema.parse(rawData)

        const sessionsRepository = new RedisSessionsRepository()
        const certificatesRepository = new PrismaCertificatesRepository()
        const googleDriveGateway = new HttpGoogleDriveGateway()
        const fileContentExtractorFactory = new FileContentExtractorFactory()

        const createTemplateByUrlUseCase = new CreateTemplateByUrlUseCase(
            certificatesRepository,
            sessionsRepository,
            googleDriveGateway,
            fileContentExtractorFactory,
        )

        await createTemplateByUrlUseCase.execute({
            ...parsedData,
            sessionToken,
        })

        revalidateTag('certificate')

        console.log('chegou')
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
