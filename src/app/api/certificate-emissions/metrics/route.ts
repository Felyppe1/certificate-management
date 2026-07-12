'use server'

import { GetCertificateEmissionsMetricsUseCase } from '@/backend/application/get-certificate-emissions-metrics-use-case'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificateEmissionsRepositoryRead } from '@/backend/interface-adapters/repository/prisma/read/prisma-certificate-emissions-repository-read'

import { handleError, HandleErrorResponse } from '@/app/api/_utils/handle-error'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { NextRequest, NextResponse } from 'next/server'

export interface GetCertificateEmissionsMetricsResponse {
    certificateEmissionsMetrics: {
        totalCertificatesGenerated: number
        totalEmailsSent: number
        dailyCertificates: { date: Date; quantity: number }[]
        dailyEmails: { date: Date; quantity: number }[]
    }
}

export async function GET(
    request: NextRequest,
): Promise<
    NextResponse<GetCertificateEmissionsMetricsResponse | HandleErrorResponse>
> {
    try {
        const { userId } = await validateSessionToken(request)

        const certificateEmissionsRepositoryRead =
            new PrismaCertificateEmissionsRepositoryRead(prisma)

        const getAllCertificatesUseCase =
            new GetCertificateEmissionsMetricsUseCase(
                certificateEmissionsRepositoryRead,
            )

        const certificateEmissionsMetrics =
            await getAllCertificatesUseCase.execute({
                userId,
            })

        return NextResponse.json({ certificateEmissionsMetrics })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
