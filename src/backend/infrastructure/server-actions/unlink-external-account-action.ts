'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { UnlinkExternalAccountUseCase } from '@/backend/application/unlink-external-account-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaUsersRepository } from '../../interface-adapters/repository/prisma/write/prisma-users-repository'
import { prisma } from '../repository/prisma'
import { logoutAction } from './logout-action'
import { redirect } from 'next/navigation'
import { unlinkExternalAccountSchema } from './schemas'
import { GoogleAuthGateway } from '../../interface-adapters/gateway/google-auth-gateway'

export async function unlinkExternalAccountAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        provider: formData.get('provider') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsed = unlinkExternalAccountSchema.parse(rawData)

        const usersRepository = new PrismaUsersRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()

        const useCase = new UnlinkExternalAccountUseCase(
            usersRepository,
            googleAuthGateway,
        )

        await useCase.execute({ userId, provider: parsed.provider })

        return { success: true }
    } catch (error: any) {
        if (error instanceof AuthenticationError) {
            await logoutAction()
            redirect(`/entrar?error=${error.type}`)
        }
        return { success: false, errorType: error.type }
    }
}
