'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaUsersRepository } from '../repository/prisma/prisma-users-repository'
import { prisma } from '../repository/prisma'
import { GoogleAuthGateway } from '../gateway/google-auth-gateway'
import { RefreshGoogleAccessTokenUseCase } from '@/backend/application/refresh-google-access-token-use-case'
import { logoutAction } from './logout-action'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { redirect } from 'next/navigation'

export async function refreshGoogleAccessTokenAction() {
    try {
        const { userId } = await validateSessionToken()

        const usersRepository = new PrismaUsersRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()

        const refreshGoogleAccessTokenUseCase =
            new RefreshGoogleAccessTokenUseCase(
                usersRepository,
                googleAuthGateway,
            )

        await refreshGoogleAccessTokenUseCase.execute({ userId })

        return {
            success: true,
        }
    } catch (error: any) {
        if (error instanceof AuthenticationError) {
            if (
                error.type === 'missing-session' ||
                error.type === 'session-not-found'
            ) {
                await logoutAction()
                redirect(`/entrar?error=${error.type}`)
            }

            // TODO: como fazer para fazer login novamente pegando o refresh token por popup
            // if (['external-account-not-found', 'google-token-refresh-failed'].includes(error.type)) {
            //     return {
            //         success: false,
            //     }
            // }
        }

        return {
            success: false,
            errorType: error.type,
        }
    }
}
