'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import {
    GetCertificateEmissionsParams,
    GetCertificateEmissionsResponse,
} from '@/app/api/certificate-emissions/route'
import { GetAllCertificateEmissionsUseCase } from '@/backend/application/get-all-certificate-emissions-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaCertificateEmissionsRepositoryRead } from '@/backend/interface-adapters/repository/prisma/read/prisma-certificate-emissions-repository-read'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { redirect } from 'next/navigation'

export async function getCertificateEmissionsAction({
    search,
}: GetCertificateEmissionsParams = {}): Promise<GetCertificateEmissionsResponse> {
    try {
        const { userId } = await validateSessionToken()

        const useCase = new GetAllCertificateEmissionsUseCase(
            new PrismaCertificateEmissionsRepositoryRead(prisma),
        )
        const certificateEmissions = await useCase.execute({
            userId,
            search,
        })

        return { certificateEmissions }
    } catch (error) {
        if (error instanceof AuthenticationError) {
            redirect('/api/auth/sessions/logout')
        }
        throw error
    }
}
