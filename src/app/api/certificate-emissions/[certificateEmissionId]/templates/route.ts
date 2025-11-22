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
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { handleError } from '@/utils/handle-error'
import { PrismaDataSetsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-sets-repository'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
) {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const sessionToken = await getSessionToken(request)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const bucket = new GcpBucket()

        const deleteTemplateUseCase = new DeleteTemplateUseCase(
            certificateEmissionsRepository,
            dataSetsRepository,
            sessionsRepository,
            bucket,
        )

        await deleteTemplateUseCase.execute({
            certificateId: certificateEmissionId,
            sessionToken,
        })

        return new Response(null, { status: 204 })
    } catch (error: any) {
        return await handleError(error)
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
) {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const sessionToken = await getSessionToken(request)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)

        const refreshTemplateUseCase = new RefreshTemplateUseCase(
            certificatesRepository,
            dataSetsRepository,
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

        console.log('PASSOU')

        return new Response(null, { status: 204 })
    } catch (error: any) {
        return await handleError(error)
    }
}
