'use server'

import { NextRequest } from 'next/server'
import { AddDataSourceByUrlUseCase } from '@/backend/application/add-data-source-by-url-use-case'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSetsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-sets-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { SpreadsheetContentExtractorFactory } from '@/backend/infrastructure/factory/spreadsheet-content-extractor-factory'
import z from 'zod'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { handleError } from '@/utils/handle-error'

const addDataSourceByUrlSchema = z.object({
    fileUrl: z.url('Invalid file URL'),
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
) {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const sessionToken = await getSessionToken(request)

        const body = await request.json()
        const parsed = addDataSourceByUrlSchema.parse(body)

        const sessionsRepository = new PrismaSessionsRepository()
        const certificateEmissionsRepository =
            new PrismaCertificatesRepository()
        const dataSetsRepository = new PrismaDataSetsRepository()
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()
        const bucket = new GcpBucket()

        const addDataSourceByUrlUseCase = new AddDataSourceByUrlUseCase(
            certificateEmissionsRepository,
            dataSetsRepository,
            sessionsRepository,
            googleDriveGateway,
            spreadsheetContentExtractorFactory,
            bucket,
        )

        await addDataSourceByUrlUseCase.execute({
            certificateId: certificateEmissionId,
            fileUrl: parsed.fileUrl,
            sessionToken,
        })

        return new Response(null, { status: 204 })
    } catch (error: any) {
        return await handleError(error)
    }
}
