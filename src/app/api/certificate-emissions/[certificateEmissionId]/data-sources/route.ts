'use server'

import { NextRequest } from 'next/server'
import { DeleteDataSourceUseCase } from '@/backend/application/delete-data-source-use-case'
import { RefreshDataSourceUseCase } from '@/backend/application/refresh-data-source-use-case'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSetsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-sets-repository'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { SpreadsheetContentExtractorFactory } from '@/backend/infrastructure/factory/spreadsheet-content-extractor-factory'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { handleError } from '@/utils/handle-error'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
) {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const sessionToken = await getSessionToken(request)

        const sessionsRepository = new PrismaSessionsRepository()
        const certificateEmissionsRepository =
            new PrismaCertificatesRepository()
        const bucket = new GcpBucket()

        const deleteDataSourceUseCase = new DeleteDataSourceUseCase(
            certificateEmissionsRepository,
            sessionsRepository,
            bucket,
        )

        await deleteDataSourceUseCase.execute({
            certificateId: certificateEmissionId,
            sessionToken,
        })

        return new Response(null, { status: 204 })
    } catch (error: any) {
        await handleError(error)
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
) {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const sessionToken = await getSessionToken(request)

        const sessionsRepository = new PrismaSessionsRepository()
        const certificatesRepository = new PrismaCertificatesRepository()
        const dataSetsRepository = new PrismaDataSetsRepository()
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository()

        const refreshDataSourceUseCase = new RefreshDataSourceUseCase(
            certificatesRepository,
            dataSetsRepository,
            sessionsRepository,
            googleDriveGateway,
            googleAuthGateway,
            spreadsheetContentExtractorFactory,
            externalUserAccountsRepository,
        )

        await refreshDataSourceUseCase.execute({
            sessionToken,
            certificateId: certificateEmissionId,
        })

        return new Response(null, { status: 204 })
    } catch (error: any) {
        await handleError(error)
    }
}
