import { GenerateCertificatesUseCase } from '@/backend/application/generate-certificates-use-case'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { handleError } from '@/utils/handle-error'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { NextRequest } from 'next/server'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSetsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-sets-repository'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { CloudRunExternalProcessing } from '@/backend/infrastructure/gateway/cloud-run-external-processing'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
) {
    const { certificateEmissionId } = await params

    try {
        const sessionToken = await getSessionToken(request)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const externalProcessing = new CloudRunExternalProcessing(
            googleAuthGateway,
        )

        const generateCertificatesUseCase = new GenerateCertificatesUseCase(
            sessionsRepository,
            externalUserAccountsRepository,
            certificateEmissionsRepository,
            dataSetsRepository,
            externalProcessing,
        )

        await generateCertificatesUseCase.execute({
            certificateEmissionId,
            sessionToken,
        })

        return Response.json(null, { status: 204 })
    } catch (error: any) {
        return await handleError(error)
    }
}
