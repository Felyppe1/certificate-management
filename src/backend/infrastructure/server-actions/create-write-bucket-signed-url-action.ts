'use server'

import { UnauthorizedError } from '@/backend/domain/error/unauthorized-error'
import { cookies } from 'next/headers'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '../repository/prisma/prisma-sessions-repository'
import { CreateWriteBucketSignedUrlUseCase } from '@/backend/application/create-write-bucket-signed-url-use-case'
import z from 'zod'
import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'

const createWriteBucketSignedUrlActionSchema = z.object({
    certificateId: z.string().min(1, 'Certificate ID is required'),
    fileName: z.string().min(1, 'File name is required'),
    mimeType: z.enum([
        TEMPLATE_FILE_EXTENSION.PPTX,
        TEMPLATE_FILE_EXTENSION.DOCX,
    ]),
    type: z.enum(['TEMPLATE']),
})

export async function createWriteBucketSignedUrlAction(
    _: unknown,
    formData: FormData,
) {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    const rawData = {
        certificateId: formData.get('certificateId') as string,
        fileName: formData.get('fileName') as string,
        mimeType: formData.get('mimeType') as string,
        type: formData.get('type') as 'TEMPLATE',
    }

    try {
        if (!sessionToken) {
            throw new UnauthorizedError('missing-session')
        }

        const parsedData = createWriteBucketSignedUrlActionSchema.parse(rawData)

        const bucket = new GcpBucket()
        const certificatesRepository = new PrismaCertificatesRepository()
        const sessionsRepository = new PrismaSessionsRepository()

        const createWriteBucketSignedUrlUseCase =
            new CreateWriteBucketSignedUrlUseCase(
                bucket,
                certificatesRepository,
                sessionsRepository,
            )

        const signedUrl = await createWriteBucketSignedUrlUseCase.execute({
            sessionToken,
            certificateId: parsedData.certificateId,
            fileName: parsedData.fileName,
            mimeType: parsedData.mimeType,
            type: parsedData.type,
        })

        return signedUrl
    } catch (error: any) {
        console.error(error)
        // throw error

        return {
            success: false,
        }
    }
}
