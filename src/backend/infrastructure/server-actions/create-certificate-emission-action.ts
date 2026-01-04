'use server'

import { CreateCertificateEmissionUseCase } from '@/backend/application/create-certificate-emission-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { logoutAction } from './logout-action'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { createCertificateEmissionSchema } from './schemas'

export async function createCertificateEmissionAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        name: formData.get('name') as string,
    }

    let certificateEmissionId: string

    try {
        const { token } = await validateSessionToken()

        const parsedData = createCertificateEmissionSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)

        const createCertificateEmissionUseCase =
            new CreateCertificateEmissionUseCase(
                certificatesRepository,
                sessionsRepository,
            )

        certificateEmissionId = await createCertificateEmissionUseCase.execute({
            name: parsedData.name,
            sessionToken: token,
        })

        updateTag('certificate-emissions')
    } catch (error) {
        console.log(error)

        if (error instanceof AuthenticationError) {
            if (
                error.type === 'missing-session' ||
                error.type === 'session-not-found' ||
                error.type === 'user-not-found'
            ) {
                await logoutAction()
            }
        }

        return {
            success: false,
        }
    }

    redirect('/certificados/' + certificateEmissionId)
}
