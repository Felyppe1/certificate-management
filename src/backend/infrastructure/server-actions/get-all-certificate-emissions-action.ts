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
import {
    parseCertificateEmissionsSort,
    parseCertificateEmissionsStatuses,
} from '@/app/api/certificate-emissions/parse-query'

export async function getCertificateEmissionsAction({
    search,
    sort,
    status,
}: GetCertificateEmissionsParams = {}): Promise<GetCertificateEmissionsResponse> {
    try {
        const { userId } = await validateSessionToken()

        const useCase = new GetAllCertificateEmissionsUseCase(
            new PrismaCertificateEmissionsRepositoryRead(prisma),
        )
        const certificateEmissions = await useCase.execute({
            userId,
            search,
            sort: parseCertificateEmissionsSort(sort),
            statuses: parseCertificateEmissionsStatuses(status),
        })

        return { certificateEmissions }
    } catch (error) {
        if (error instanceof AuthenticationError) {
            redirect('/api/auth/sessions/logout')
        }
        throw error
    }
}
