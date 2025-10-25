'use server'

import { NextRequest } from 'next/server'
import { AddDataSourceByDrivePickerUseCase } from '@/backend/application/add-data-source-by-drive-picker-use-case'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSetsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-sets-repository'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { SpreadsheetContentExtractorFactory } from '@/backend/infrastructure/factory/spreadsheet-content-extractor-factory'
import z from 'zod'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { handleError } from '@/utils/handle-error'

const addDataSourceByDrivePickerSchema = z.object({
    fileId: z.string().min(1, 'File ID is required'),
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
) {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const sessionToken = await getSessionToken(request)

        const body = await request.json()
        const parsed = addDataSourceByDrivePickerSchema.parse(body)

        const sessionsRepository = new PrismaSessionsRepository()
        const certificateEmissionsRepository =
            new PrismaCertificatesRepository()
        const dataSetsRepository = new PrismaDataSetsRepository()
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository()
        const bucket = new GcpBucket()

        const addDataSourceByDrivePickerUseCase =
            new AddDataSourceByDrivePickerUseCase(
                certificateEmissionsRepository,
                dataSetsRepository,
                sessionsRepository,
                googleDriveGateway,
                spreadsheetContentExtractorFactory,
                externalUserAccountsRepository,
                googleAuthGateway,
                bucket,
            )

        await addDataSourceByDrivePickerUseCase.execute({
            certificateId: certificateEmissionId,
            fileId: parsed.fileId,
            sessionToken,
        })

        return new Response(null, { status: 204 })
    } catch (error: any) {
        await handleError(error)
    }
}
