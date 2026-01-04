'use server'

import { NextRequest, NextResponse } from 'next/server'
import { AddTemplateByUrlUseCase } from '@/backend/application/add-template-by-url-use-case'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import z from 'zod'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { PrismaDataSetsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-sets-repository'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'

const addTemplateByUrlBodySchema = z.object({
    fileUrl: z.url('File URL is invalid'),
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<NextResponse<null | HandleErrorResponse>> {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const { token } = await validateSessionToken(request)

        const body = await request.json()
        const parsed = addTemplateByUrlBodySchema.parse(body)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const bucket = new GcpBucket()
        const transactionManager = new PrismaTransactionManager(prisma)

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepository,
            dataSetsRepository,
            sessionsRepository,
            googleDriveGateway,
            fileContentExtractorFactory,
            bucket,
            transactionManager,
        )

        await addTemplateByUrlUseCase.execute({
            certificateId: certificateEmissionId,
            fileUrl: parsed.fileUrl,
            sessionToken: token,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
