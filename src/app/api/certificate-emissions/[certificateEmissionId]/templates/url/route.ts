'use server'

import { NextRequest } from 'next/server'
import { AddTemplateByUrlUseCase } from '@/backend/application/add-template-by-url-use-case'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import z from 'zod'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { handleError } from '@/utils/handle-error'

const addTemplateByUrlSchema = z.object({
    fileUrl: z.url('File URL is invalid'),
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
) {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const sessionToken = await getSessionToken(request)

        const body = await request.json()
        const parsed = addTemplateByUrlSchema.parse(body)

        const sessionsRepository = new PrismaSessionsRepository()
        const certificateEmissionsRepository =
            new PrismaCertificatesRepository()
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const bucket = new GcpBucket()

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepository,
            sessionsRepository,
            googleDriveGateway,
            fileContentExtractorFactory,
            bucket,
        )

        await addTemplateByUrlUseCase.execute({
            certificateId: certificateEmissionId,
            fileUrl: parsed.fileUrl,
            sessionToken,
        })

        return new Response(null, { status: 204 })
    } catch (error: any) {
        return await handleError(error)
    }
}
