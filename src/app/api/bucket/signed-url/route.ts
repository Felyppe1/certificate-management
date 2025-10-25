'use server'

import { NextRequest } from 'next/server'
import { CreateWriteBucketSignedUrlUseCase } from '@/backend/application/create-write-bucket-signed-url-use-case'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'
import z from 'zod'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { handleError } from '@/utils/handle-error'

const createWriteBucketSignedUrlSchema = z.object({
    certificateId: z.string().min(1, 'Certificate ID is required'),
    fileName: z.string().min(1, 'File name is required'),
    mimeType: z.enum([
        TEMPLATE_FILE_EXTENSION.PPTX,
        TEMPLATE_FILE_EXTENSION.DOCX,
    ]),
    type: z.enum(['TEMPLATE']),
})

export async function POST(request: NextRequest) {
    try {
        const sessionToken = await getSessionToken(request)

        const body = await request.json()
        const parsed = createWriteBucketSignedUrlSchema.parse(body)

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
            certificateId: parsed.certificateId,
            fileName: parsed.fileName,
            mimeType: parsed.mimeType,
            type: parsed.type,
        })

        return Response.json({ signedUrl }, { status: 200 })
    } catch (error: any) {
        await handleError(error)
    }
}
