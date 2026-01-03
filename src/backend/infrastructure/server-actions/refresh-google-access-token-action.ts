'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { cookies } from 'next/headers'
import { PrismaSessionsRepository } from '../repository/prisma/prisma-sessions-repository'
import { PrismaExternalUserAccountsRepository } from '../repository/prisma/prisma-external-user-accounts-repository'
import { prisma } from '../repository/prisma'
import { GoogleAuthGateway } from '../gateway/google-auth-gateway'
import { RefreshGoogleAccessTokenUseCase } from '@/backend/application/refresh-google-access-token-use-case'
import { logoutAction } from './logout-action'
import { updateTag } from 'next/cache'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'

export async function refreshGoogleAccessTokenAction() {
    try {
        const { userId } = await validateSessionToken()

        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()

        const refreshGoogleAccessTokenUseCase =
            new RefreshGoogleAccessTokenUseCase(
                externalUserAccountsRepository,
                googleAuthGateway,
            )

        await refreshGoogleAccessTokenUseCase.execute({ userId })
    } catch (error) {
        if (error instanceof AuthenticationError) {
            if (
                error.type === 'missing-session' ||
                error.type === 'session-not-found'
            ) {
                await logoutAction()
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
            message: 'Não foi possível acessar seu Google Drive',
        }
    }

    updateTag('me')

    return { success: true }
}
