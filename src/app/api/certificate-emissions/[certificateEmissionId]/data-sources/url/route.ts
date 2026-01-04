'use server'

import { NextRequest, NextResponse } from 'next/server'
import { AddDataSourceByUrlUseCase } from '@/backend/application/add-data-source-by-url-use-case'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSetsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-sets-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { SpreadsheetContentExtractorFactory } from '@/backend/infrastructure/factory/spreadsheet-content-extractor-factory'
import z from 'zod'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'

const addDataSourceByUrlBodySchema = z.object({
    fileUrl: z.url('Invalid file URL'),
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<NextResponse<null | HandleErrorResponse>> {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const { token } = await validateSessionToken(request)

        const body = await request.json()
        const parsed = addDataSourceByUrlBodySchema.parse(body)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()
        const bucket = new GcpBucket()
        const transactionManager = new PrismaTransactionManager(prisma)

        const addDataSourceByUrlUseCase = new AddDataSourceByUrlUseCase(
            certificateEmissionsRepository,
            dataSetsRepository,
            sessionsRepository,
            googleDriveGateway,
            spreadsheetContentExtractorFactory,
            bucket,
            transactionManager,
        )

        await addDataSourceByUrlUseCase.execute({
            certificateId: certificateEmissionId,
            fileUrl: parsed.fileUrl,
            sessionToken: token,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
