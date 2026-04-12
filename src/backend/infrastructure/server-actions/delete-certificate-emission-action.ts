'use server'

import { DeleteCertificateEmissionUseCase } from '@/backend/application/delete-certificate-emission-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { logoutAction } from './logout-action'
import { deleteCertificateEmissionSchema } from './schemas'
import { redirect } from 'next/navigation'

export async function deleteCertificateEmissionAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const { userId } = await validateSessionToken()
        const parsedData = deleteCertificateEmissionSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const bucket = new GcpBucket()

        const deleteCertificateEmissionUseCase =
            new DeleteCertificateEmissionUseCase(certificatesRepository, bucket)

        await deleteCertificateEmissionUseCase.execute({
            certificateId: parsedData.certificateId,
            userId,
        })

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting certificate emission:', error)

        if (error instanceof AuthenticationError) {
            if (
                error.type === 'missing-session' ||
                error.type === 'session-not-found' ||
                error.type === 'user-not-found'
            ) {
                await logoutAction()
                redirect(`/entrar?error=${error.type}`)
            }
        }

        return {
            success: false,
            errorType: error.type,
        }
    }
}
