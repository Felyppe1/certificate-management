'use server'

import { AddTemplateByUrlUseCase } from '@/backend/application/add-template-by-url-use-case'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import { HttpGoogleDriveGateway } from '@/backend/infrastructure/gateway/http-google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { RedisSessionsRepository } from '@/backend/infrastructure/repository/redis/redis-sessions-repository'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import z, { ZodError } from 'zod'

const addTemplateByUrlActionSchema = z.object({
    fileUrl: z.url('URL do arquivo inválida'),
})

export async function addTemplateByUrlAction(_: unknown, formData: FormData) {
    const cookie = await cookies()

    const rawData = {
        certificateId: formData.get('certificateId') as string,
        fileUrl: formData.get('fileUrl') as string,
    }

    let newTemplateId: string

    try {
        const sessionToken = cookie.get('session_token')!.value

        const parsedData = addTemplateByUrlActionSchema.parse(rawData)

        const sessionsRepository = new RedisSessionsRepository()
        const certificateEmissionsRepository =
            new PrismaCertificatesRepository()
        const googleDriveGateway = new HttpGoogleDriveGateway()
        const fileContentExtractorFactory = new FileContentExtractorFactory()

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepository,
            sessionsRepository,
            googleDriveGateway,
            fileContentExtractorFactory,
        )

        await addTemplateByUrlUseCase.execute({
            certificateId: rawData.certificateId,
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

    // redirect('/templates/' + newTemplateId)
}
