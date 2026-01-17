import { GenerateCertificatesUseCase } from '@/backend/application/generate-certificates-use-case'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { NextRequest, NextResponse } from 'next/server'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-source-rows-repository'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GcpPubSub } from '@/backend/infrastructure/cloud/gcp/gcp-pubsub'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<NextResponse<null | HandleErrorResponse>> {
    const { certificateEmissionId } = await params

    try {
        const { userId } = await validateSessionToken(request)

        const bucket = new GcpBucket()
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const googleAuthGateway = new GoogleAuthGateway()
        const pubSub = new GcpPubSub()

        const generateCertificatesUseCase = new GenerateCertificatesUseCase(
            bucket,
            certificateEmissionsRepository,
            dataSourceRowsRepository,
            dataSourceRowsRepository,
            pubSub,
        )

        await generateCertificatesUseCase.execute({
            certificateEmissionId,
            userId,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
