'use server'

import { NextRequest, NextResponse } from 'next/server'
import { AddTemplateByUploadUseCase } from '@/backend/application/add-template-by-upload-use-case'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import z from 'zod'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { PrismaDataSourceRowsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'

const MAXIMUM_FILE_SIZE = 5 * 1024 * 1024

const addTemplateByUploadBodySchema = z.object({
    file: z.instanceof(File).refine(file => file.size <= MAXIMUM_FILE_SIZE, {
        message: 'File size must be less than 5MB',
    }),
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<NextResponse<null | HandleErrorResponse>> {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const { userId } = await validateSessionToken(request)

        const formData = await request.formData()
        const file = formData.get('file') as File

        const parsed = addTemplateByUploadBodySchema.parse({ file })

        const bucket = new GcpBucket()
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const transactionManager = new PrismaTransactionManager(prisma)

        const addTemplateByUploadUseCase = new AddTemplateByUploadUseCase(
            bucket,
            certificatesRepository,
            dataSourceRowsRepository,
            fileContentExtractorFactory,
            transactionManager,
        )

        await addTemplateByUploadUseCase.execute({
            userId,
            certificateId: certificateEmissionId,
            file: parsed.file,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
