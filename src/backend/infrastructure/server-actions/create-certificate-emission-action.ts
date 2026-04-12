'use server'

import { CreateCertificateEmissionUseCase } from '@/backend/application/create-certificate-emission-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'

import { prisma } from '@/backend/infrastructure/repository/prisma'
import { logoutAction } from './logout-action'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { createCertificateEmissionSchema } from './schemas'
import { redirect } from 'next/navigation'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '@/backend/domain/error/validation-error'

export async function createCertificateEmissionAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        name: formData.get('name') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = createCertificateEmissionSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)

        const createCertificateEmissionUseCase =
            new CreateCertificateEmissionUseCase(certificatesRepository)

        // throw new AuthenticationError('user-not-found')
        const certificateEmissionId =
            await createCertificateEmissionUseCase.execute({
                name: parsedData.name,
                userId,
            })

        return {
            success: true,
            certificateEmissionId,
        }
    } catch (error: any) {
        console.log(error)

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
