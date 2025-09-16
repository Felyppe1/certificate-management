'use server'

import { RefreshTemplateByUrlUseCase } from '@/backend/application/refresh-template-by-url-use-case'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import { HttpGoogleDriveGateway } from '@/backend/infrastructure/gateway/http-google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { RedisSessionsRepository } from '@/backend/infrastructure/repository/redis/redis-sessions-repository'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z, { ZodError } from 'zod'

const refreshTemplateByUrlActionSchema = z.object({
    certificateId: z.string().min(1, 'ID do certificado é obrigatório'),
})

export async function refreshTemplateByUrlAction(
    _: unknown,
    formData: FormData,
) {
    const cookie = await cookies()

    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const sessionToken = cookie.get('session_token')!.value

        const parsedData = refreshTemplateByUrlActionSchema.parse(rawData)

        const sessionsRepository = new RedisSessionsRepository()
        const certificatesRepository = new PrismaCertificatesRepository()
        const googleDriveGateway = new HttpGoogleDriveGateway()
        const fileContentExtractorFactory = new FileContentExtractorFactory()

        const refreshTemplateByUrlUseCase = new RefreshTemplateByUrlUseCase(
            certificatesRepository,
            sessionsRepository,
            googleDriveGateway,
            fileContentExtractorFactory,
        )

        await refreshTemplateByUrlUseCase.execute({
            sessionToken,
            certificateId: parsedData.certificateId,
        })

        revalidateTag('template')

        return {
            success: true,
        }
    } catch (error) {
        console.error(error)
        return {
            success: false,
            message: 'Erro ao atualizar os dados do template',
        }
        // if (error instanceof ZodError) {

        // }
    }
}
