'use server'

import { NextRequest } from 'next/server'
import { AddDataSourceByDrivePickerUseCase } from '@/backend/application/add-data-source-by-drive-picker-use-case'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSetsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-sets-repository'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { SpreadsheetContentExtractorFactory } from '@/backend/infrastructure/factory/spreadsheet-content-extractor-factory'
import z from 'zod'
import { handleError } from '@/utils/handle-error'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'

const addDataSourceByDrivePickerSchema = z.object({
    fileId: z.string().min(1, 'File ID is required'),
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
) {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const { userId } = await validateSessionToken(request)

        const body = await request.json()
        const parsed = addDataSourceByDrivePickerSchema.parse(body)

        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)
        const bucket = new GcpBucket()
        const transactionManager = new PrismaTransactionManager(prisma)

        const addDataSourceByDrivePickerUseCase =
            new AddDataSourceByDrivePickerUseCase(
                certificateEmissionsRepository,
                dataSetsRepository,
                googleDriveGateway,
                spreadsheetContentExtractorFactory,
                externalUserAccountsRepository,
                googleAuthGateway,
                bucket,
                transactionManager,
            )

        await addDataSourceByDrivePickerUseCase.execute({
            certificateId: certificateEmissionId,
            fileId: parsed.fileId,
            userId,
        })

        return new Response(null, { status: 204 })
    } catch (error: any) {
        return await handleError(error)
    }
}
