'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { GetCertificateEmissionsResponse } from '@/app/api/certificate-emissions/route'
import { GetAllCertificateEmissionsUseCase } from '@/backend/application/get-all-certificate-emissions-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { redirect } from 'next/navigation'

export async function getCertificateEmissionsAction(): Promise<GetCertificateEmissionsResponse> {
    try {
        const { userId } = await validateSessionToken()

        const useCase = new GetAllCertificateEmissionsUseCase()
        const certificateEmissions = await useCase.execute({ userId })

        return { certificateEmissions }
    } catch (error) {
        if (error instanceof AuthenticationError) {
            redirect('/api/auth/sessions/logout')
        }
        throw error
    }
}
