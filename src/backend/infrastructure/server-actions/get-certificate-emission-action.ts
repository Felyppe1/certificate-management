'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { GetCertificateEmissionUseCase } from '@/backend/application/get-certificate-emission-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { NotFoundError } from '@/backend/domain/error/not-found-error'
import { ForbiddenError } from '@/backend/domain/error/forbidden-error'
import { notFound, redirect } from 'next/navigation'
import { GetCertificateEmissionResponse } from '@/app/api/certificate-emissions/[certificateEmissionId]/route'

export async function getCertificateEmissionAction(
    certificateId: string,
): Promise<GetCertificateEmissionResponse> {
    try {
        const { userId } = await validateSessionToken()

        const useCase = new GetCertificateEmissionUseCase()
        const certificateEmission = await useCase.execute({
            certificateId,
            userId,
        })
        return { certificateEmission }
    } catch (error) {
        if (error instanceof AuthenticationError) {
            redirect('/api/auth/sessions/logout')
        }
        if (error instanceof NotFoundError) {
            notFound()
        }
        if (error instanceof ForbiddenError) {
            redirect('/')
        }
        throw error
    }
}
