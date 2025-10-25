'use server'

import { NextRequest } from 'next/server'
import { DeleteTemplateUseCase } from '@/backend/application/delete-template-use-case'
import { RefreshTemplateUseCase } from '@/backend/application/refresh-template-use-case'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
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

        const deleteTemplateUseCase = new DeleteTemplateUseCase(
            certificateEmissionsRepository,
            sessionsRepository,
            bucket,
        )

        await deleteTemplateUseCase.execute({
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
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository()

        const refreshTemplateUseCase = new RefreshTemplateUseCase(
            certificatesRepository,
            sessionsRepository,
            googleDriveGateway,
            googleAuthGateway,
            fileContentExtractorFactory,
            externalUserAccountsRepository,
        )

        await refreshTemplateUseCase.execute({
            sessionToken,
            certificateId: certificateEmissionId,
        })

        return new Response(null, { status: 204 })
    } catch (error: any) {
        await handleError(error)
    }
}
