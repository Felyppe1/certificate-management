'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { cookies } from 'next/headers'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '../repository/prisma/prisma-sessions-repository'
import { prisma } from '../repository/prisma'
import z from 'zod'
import { AddTemplateByUploadUseCase } from '@/backend/application/add-template-by-upload-use-case'
import { FileContentExtractorFactory } from '../factory/file-content-extractor-factory'
import { revalidateTag } from 'next/cache'

const MAXIMUM_FILE_SIZE = 5 * 1024 * 1024

const addTemplateByUploadActionActionSchema = z.object({
    certificateId: z.string().min(1, 'Certificate ID is required'),
    file: z.instanceof(File).refine(file => file.size <= MAXIMUM_FILE_SIZE, {
        message: 'File size must be less than 5MB',
    }),
})

export async function addTemplateByUploadAction(
    _: unknown,
    formData: FormData,
) {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    const rawData = {
        certificateId: formData.get('certificateId') as string,
        file: formData.get('file') as File,
    }

    try {
        if (!sessionToken) {
            throw new AuthenticationError('missing-session')
        }

        const parsedData = addTemplateByUploadActionActionSchema.parse(rawData)

        const bucket = new GcpBucket()
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const fileContentExtractorFactory = new FileContentExtractorFactory()

        const addTemplateByUploadUseCase = new AddTemplateByUploadUseCase(
            bucket,
            sessionsRepository,
            certificatesRepository,
            fileContentExtractorFactory,
        )

        await addTemplateByUploadUseCase.execute({
            sessionToken,
            certificateId: parsedData.certificateId,
            file: parsedData.file,
        })
    } catch (error: any) {
        console.error(error)
        // throw error

        return {
            success: false,
            message: 'Ocorreu um erro ao definir o template. Tente novamente.',
        }
    }

    revalidateTag('certificate')

    return {
        success: true,
        message: 'Template definido com sucesso',
    }
}
