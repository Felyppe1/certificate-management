'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { updateTag } from 'next/cache'
import z from 'zod'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { GenerateCertificatesUseCase } from '@/backend/application/generate-certificates-use-case'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'
import { CloudRunExternalProcessing } from '../gateway/cloud-run-external-processing'
import { GoogleAuthGateway } from '../gateway/google-auth-gateway'
import { PrismaExternalUserAccountsRepository } from '../repository/prisma/prisma-external-user-accounts-repository'

const generateCertificatesActionSchema = z.object({
    certificateId: z.string().min(1, 'ID do certificado é obrigatório'),
})

export async function generateCertificatesAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const sessionToken = await getSessionToken()

        const parsedData = generateCertificatesActionSchema.parse(rawData)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const externalProcessing = new CloudRunExternalProcessing(
            googleAuthGateway,
        )

        const generateCertificatesUseCase = new GenerateCertificatesUseCase(
            sessionsRepository,
            externalUserAccountsRepository,
            certificateEmissionsRepository,
            dataSetsRepository,
            externalProcessing,
        )

        await generateCertificatesUseCase.execute({
            certificateEmissionId: parsedData.certificateId,
            sessionToken,
        })
    } catch (error: any) {
        console.log(error)

        if (error instanceof AuthenticationError) {
            if (
                error.type === 'missing-session' ||
                error.type === 'session-not-found'
            ) {
                await logoutAction()
            }

            return {
                success: false,
                message: 'Sua conta da Google precisa ser reconectada',
            }
        }

        return {
            success: false,
            message: 'Ocorreu um erro ao tentar gerar os certificados',
        }
    }

    updateTag('certificate')

    return {
        success: true,
        message: 'Certificados gerados com sucesso',
    }
}
