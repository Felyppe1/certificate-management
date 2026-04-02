'use server'

import { NextRequest, NextResponse } from 'next/server'
import { AddDataSourceByUploadUseCase } from '@/backend/application/add-data-source-by-upload-use-case'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-source-rows-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { SpreadsheetContentExtractorFactory } from '@/backend/infrastructure/factory/spreadsheet-content-extractor-factory'
import z from 'zod'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'

const MAXIMUM_FILE_SIZE = 5 * 1024 * 1024

const addDataSourceByUploadBodySchema = z.object({
    files: z
        .array(z.instanceof(File))
        .min(1)
        .max(4)
        .refine(files => files.every(f => f.size <= MAXIMUM_FILE_SIZE), {
            message: 'Each file must be less than 5MB',
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
        const files = formData.getAll('files') as File[]

        const parsed = addDataSourceByUploadBodySchema.parse({ files })

        const bucket = new GcpBucket()
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()
        const transactionManager = new PrismaTransactionManager(prisma)

        const addDataSourceByUploadUseCase = new AddDataSourceByUploadUseCase(
            bucket,
            certificatesRepository,
            dataSourceRowsRepository,
            spreadsheetContentExtractorFactory,
            transactionManager,
        )

        await addDataSourceByUploadUseCase.execute({
            userId,
            certificateId: certificateEmissionId,
            files: parsed.files,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
