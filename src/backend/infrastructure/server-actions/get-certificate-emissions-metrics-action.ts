'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { GetCertificateEmissionsMetricsUseCase } from '@/backend/application/get-certificate-emissions-metrics-use-case'
import { PrismaCertificatesRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { redirect } from 'next/navigation'
import { GetCertificateEmissionsMetricsResponse } from '@/app/api/certificate-emissions/metrics/route'

export async function getCertificateEmissionsMetricsAction(): Promise<GetCertificateEmissionsMetricsResponse> {
    try {
        const { userId } = await validateSessionToken()

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const useCase = new GetCertificateEmissionsMetricsUseCase(
            certificatesRepository,
        )
        const metrics = await useCase.execute({ userId })

        return { certificateEmissionsMetrics: metrics }
    } catch (error) {
        if (error instanceof AuthenticationError) {
            redirect('/api/auth/sessions/logout')
        }
        throw error
    }
}
