'use server'

import { GetCertificateEmissionsMetricsUseCase } from '@/backend/application/get-certificate-emissions-metrics-use-case'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { handleError } from '@/utils/handle-error'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const { token } = await validateSessionToken(request)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const certificatesRepository = new PrismaCertificatesRepository(prisma)

        const getAllCertificatesUseCase =
            new GetCertificateEmissionsMetricsUseCase(
                sessionsRepository,
                certificatesRepository,
            )

        const certificateEmissionsMetrics =
            await getAllCertificatesUseCase.execute({
                sessionToken: token,
            })

        return NextResponse.json({ certificateEmissionsMetrics })
    } catch (error: any) {
        return await handleError(error)
    }
}
