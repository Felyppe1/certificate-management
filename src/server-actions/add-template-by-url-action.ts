'use server'

import { AddTemplateByUrlUseCase } from '@/backend/application/add-template-by-url-use-case'
import { FileUrlNotFoundError } from '@/backend/domain/error/file-url-not-found-error'
import { UnauthorizedError } from '@/backend/domain/error/unauthorized-error'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import { HttpGoogleDriveGateway } from '@/backend/infrastructure/gateway/http-google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z from 'zod'

const addTemplateByUrlActionSchema = z.object({
    certificateId: z.string().min(1, 'ID do certificado é obrigatório'),
    fileUrl: z.url('URL do arquivo inválida'),
})

export async function addTemplateByUrlAction(_: unknown, formData: FormData) {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    const rawData = {
        certificateId: formData.get('certificateId') as string,
        fileUrl: formData.get('fileUrl') as string,
    }

    // let newTemplateId: string

    try {
        if (!sessionToken) {
            throw new UnauthorizedError('Session token not present')
        }

        const parsedData = addTemplateByUrlActionSchema.parse(rawData)

        const sessionsRepository = new PrismaSessionsRepository()
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
    } catch (error: any) {
        console.log(error)

        globalThis.logger?.emit({
            severityText: 'ERROR',
            body: 'Error adding template by URL',
            attributes: {
                err: error,
                message: 'Error adding template by URL',
                certificateId: rawData.certificateId,
            },
        })

        return {
            success: false,
            message:
                error instanceof FileUrlNotFoundError
                    ? 'Arquivo não encontrado'
                    : 'Ocorreu um erro ao adicionar template',
        }
        // if (error instanceof ZodError) {

        // }
    }

    revalidateTag('certificate')

    return {
        success: true,
        message: 'Template adicionado com sucesso',
    }
    // redirect('/templates/' + newTemplateId)
}
