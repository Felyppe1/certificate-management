'use server'

import { NextRequest } from 'next/server'
import { AddDataSourceByUploadUseCase } from '@/backend/application/add-data-source-by-upload-use-case'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSetsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-sets-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { SpreadsheetContentExtractorFactory } from '@/backend/infrastructure/factory/spreadsheet-content-extractor-factory'
import z from 'zod'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { handleError } from '@/utils/handle-error'

const MAXIMUM_FILE_SIZE = 5 * 1024 * 1024

const addDataSourceByUploadSchema = z.object({
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

        const parsed = addDataSourceByUploadSchema.parse({ file })

        const bucket = new GcpBucket()
        const certificatesRepository = new PrismaCertificatesRepository()
        const dataSetsRepository = new PrismaDataSetsRepository()
        const sessionsRepository = new PrismaSessionsRepository()
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()

        const addDataSourceByUploadUseCase = new AddDataSourceByUploadUseCase(
            bucket,
            sessionsRepository,
            certificatesRepository,
            dataSetsRepository,
            spreadsheetContentExtractorFactory,
        )

        await addDataSourceByUploadUseCase.execute({
            sessionToken,
            certificateId: certificateEmissionId,
            file: parsed.file,
        })

        return new Response(null, { status: 204 })
    } catch (error: any) {
        await handleError(error)
    }
}
