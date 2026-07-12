import { handleError, HandleErrorResponse } from '@/app/api/_utils/handle-error'
import { GenerateCertificatesUseCase } from '@/backend/application/generate-certificates-use-case'
import { env } from '@/env'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { NextRequest, NextResponse } from 'next/server'
import { PrismaCertificatesRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { GoogleAuthGateway } from '@/backend/interface-adapters/gateway/google-auth-gateway'
import { CloudTasksQueue } from '@/backend/interface-adapters/cloud/gcp/cloud-tasks-queue'
import { LocalQueue } from '@/backend/interface-adapters/cloud/local/local-queue'
import { GcpBucket } from '@/backend/interface-adapters/cloud/gcp/gcp-bucket'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { gcpCloudTasks, gcpStorage } from '@/backend/infrastructure/cloud/gcp'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<NextResponse<null | HandleErrorResponse>> {
    const { certificateEmissionId } = await params

    try {
        const { userId } = await validateSessionToken(request)

        const bucket = new GcpBucket(gcpStorage)
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const usersRepository = new PrismaUsersRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const queue =
            env.NODE_ENV !== 'production' || env.IS_E2E
                ? new LocalQueue()
                : new CloudTasksQueue(gcpCloudTasks)

        const generateCertificatesUseCase = new GenerateCertificatesUseCase(
            bucket,
            certificateEmissionsRepository,
            usersRepository,
            dataSourceRowsRepository,
            dataSourceRowsRepository,
            queue,
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
