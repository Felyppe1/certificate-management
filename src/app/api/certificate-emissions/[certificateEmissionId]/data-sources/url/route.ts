'use server'

import { NextRequest, NextResponse } from 'next/server'
import { AddDataSourceByUrlUseCase } from '@/backend/application/add-data-source-by-url-use-case'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-source-rows-repository'

import { prisma } from '@/backend/infrastructure/repository/prisma'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { SpreadsheetContentExtractorFactory } from '@/backend/infrastructure/factory/spreadsheet-content-extractor-factory'
import z from 'zod'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'

const addDataSourceByUrlBodySchema = z.object({
    fileUrls: z.array(z.url('Invalid file URL')).min(1).max(4),
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<NextResponse<null | HandleErrorResponse>> {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const { userId } = await validateSessionToken(request)

        const body = await request.json()
        const parsed = addDataSourceByUrlBodySchema.parse(body)

        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()
        const bucket = new GcpBucket()
        const transactionManager = new PrismaTransactionManager(prisma)
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)

        const addDataSourceByUrlUseCase = new AddDataSourceByUrlUseCase(
            certificateEmissionsRepository,
            dataSourceRowsRepository,
            googleDriveGateway,
            spreadsheetContentExtractorFactory,
            bucket,
            transactionManager,
            externalUserAccountsRepository,
        )

        await addDataSourceByUrlUseCase.execute({
            certificateId: certificateEmissionId,
            fileUrls: parsed.fileUrls,
            userId,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
