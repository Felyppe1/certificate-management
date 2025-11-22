'use server'

import { RefreshTemplateUseCase } from '@/backend/application/refresh-template-use-case'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z from 'zod'
import { PrismaExternalUserAccountsRepository } from '../repository/prisma/prisma-external-user-accounts-repository'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { GoogleAuthGateway } from '../gateway/google-auth-gateway'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'

const refreshTemplateActionSchema = z.object({
    certificateId: z.string().min(1, 'ID do certificado é obrigatório'),
})

export async function refreshTemplateAction(_: unknown, formData: FormData) {
    const cookie = await cookies()

    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const sessionToken = cookie.get('session_token')!.value

        const parsedData = refreshTemplateActionSchema.parse(rawData)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)

        const refreshTemplateUseCase = new RefreshTemplateUseCase(
            certificatesRepository,
            dataSetsRepository,
            sessionsRepository,
            googleDriveGateway,
            googleAuthGateway,
            fileContentExtractorFactory,
            externalUserAccountsRepository,
        )

        await refreshTemplateUseCase.execute({
            sessionToken,
            certificateId: parsedData.certificateId,
        })

        revalidateTag('certificate')

        return {
            success: true,
        }
    } catch (error) {
        console.error(error)

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
            message: 'Um erro inesperado ocorreu ao atualizar o template',
        }
    }
}
