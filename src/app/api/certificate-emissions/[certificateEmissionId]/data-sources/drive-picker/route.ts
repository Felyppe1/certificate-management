'use server'

import { NextRequest, NextResponse } from 'next/server'
import { AddDataSourceByDrivePickerUseCase } from '@/backend/application/add-data-source-by-drive-picker-use-case'
import { GoogleAuthGateway } from '@/backend/interface-adapters/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/interface-adapters/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { GcpBucket } from '@/backend/interface-adapters/cloud/gcp/gcp-bucket'
import { SpreadsheetContentExtractorFactory } from '@/backend/interface-adapters/factory/spreadsheet-content-extractor-factory'
import z from 'zod'
import { handleError, HandleErrorResponse } from '@/app/api/_utils/handle-error'
import { PrismaTransactionManager } from '@/backend/interface-adapters/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { gcpStorage } from '@/backend/infrastructure/cloud/gcp'

const addDataSourceByDrivePickerBodySchema = z.object({
    fileIds: z.array(z.string().min(1)).min(1).max(4),
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<NextResponse<null | HandleErrorResponse>> {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const { userId } = await validateSessionToken(request)

        const body = await request.json()
        const parsed = addDataSourceByDrivePickerBodySchema.parse(body)

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
        const usersRepository = new PrismaUsersRepository(prisma)
        const bucket = new GcpBucket(gcpStorage)
        const transactionManager = new PrismaTransactionManager(prisma)

        const addDataSourceByDrivePickerUseCase =
            new AddDataSourceByDrivePickerUseCase(
                certificateEmissionsRepository,
                dataSourceRowsRepository,
                googleDriveGateway,
                spreadsheetContentExtractorFactory,
                usersRepository,
                googleAuthGateway,
                bucket,
                transactionManager,
            )

        await addDataSourceByDrivePickerUseCase.execute({
            certificateId: certificateEmissionId,
            fileIds: parsed.fileIds,
            userId,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
