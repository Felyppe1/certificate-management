'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { updateTag } from 'next/cache'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { GenerateCertificatesUseCase } from '@/backend/application/generate-certificates-use-case'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'
import { GoogleAuthGateway } from '../gateway/google-auth-gateway'
import { PrismaExternalUserAccountsRepository } from '../repository/prisma/prisma-external-user-accounts-repository'
import { GcpPubSub } from '../cloud/gcp/gcp-pubsub'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { generateCertificatesSchema } from './schemas'

export async function generateCertificatesAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = generateCertificatesSchema.parse(rawData)

        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const pubSub = new GcpPubSub()

        const generateCertificatesUseCase = new GenerateCertificatesUseCase(
            externalUserAccountsRepository,
            certificateEmissionsRepository,
            dataSetsRepository,
            pubSub,
        )

        await generateCertificatesUseCase.execute({
            certificateEmissionId: parsedData.certificateId,
            userId,
        })
    } catch (error: any) {
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
            errorType: error.type,
        }
    }

    updateTag('certificate')

    return {
        success: true,
    }
}
