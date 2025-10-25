'use server'

import { NextRequest } from 'next/server'
import { AddTemplateByUploadUseCase } from '@/backend/application/add-template-by-upload-use-case'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import z from 'zod'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { handleError } from '@/utils/handle-error'

const MAXIMUM_FILE_SIZE = 5 * 1024 * 1024

const addTemplateByUploadSchema = z.object({
    file: z.instanceof(File).refine(file => file.size <= MAXIMUM_FILE_SIZE, {
        message: 'File size must be less than 5MB',
    }),
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
) {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const sessionToken = await getSessionToken(request)

        const formData = await request.formData()
        const file = formData.get('file') as File

        const parsed = addTemplateByUploadSchema.parse({ file })

        const bucket = new GcpBucket()
        const certificatesRepository = new PrismaCertificatesRepository()
        const sessionsRepository = new PrismaSessionsRepository()
        const fileContentExtractorFactory = new FileContentExtractorFactory()

        const addTemplateByUploadUseCase = new AddTemplateByUploadUseCase(
            bucket,
            sessionsRepository,
            certificatesRepository,
            fileContentExtractorFactory,
        )

        await addTemplateByUploadUseCase.execute({
            sessionToken,
            certificateId: certificateEmissionId,
            file: parsed.file,
        })

        return new Response(null, { status: 204 })
    } catch (error: any) {
        await handleError(error)
    }
}
