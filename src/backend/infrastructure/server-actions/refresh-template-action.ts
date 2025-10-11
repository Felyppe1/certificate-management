'use server'

import { RefreshTemplateUseCase } from '@/backend/application/refresh-template-use-case'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import { HttpGoogleDriveGateway } from '@/backend/infrastructure/gateway/http-google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z from 'zod'
import { PrismaExternalUserAccountsRepository } from '../repository/prisma/prisma-external-user-accounts-repository'
import { UnauthorizedError } from '@/backend/domain/error/unauthorized-error'
import { logoutAction } from './logout-action'
import { GoogleAuthGateway } from '../gateway/google-auth-gateway'

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

        const sessionsRepository = new PrismaSessionsRepository()
        const certificatesRepository = new PrismaCertificatesRepository()
        const googleDriveGateway = new HttpGoogleDriveGateway()
        const googleAuthGateway = new GoogleAuthGateway()
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository()

        const refreshTemplateUseCase = new RefreshTemplateUseCase(
            certificatesRepository,
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

        revalidateTag('template')

        return {
            success: true,
        }
    } catch (error) {
        console.error(error)

        if (error instanceof UnauthorizedError) {
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
