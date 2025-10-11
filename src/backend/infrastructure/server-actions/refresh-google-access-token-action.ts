'use server'

import { UnauthorizedError } from '@/backend/domain/error/unauthorized-error'
import { cookies } from 'next/headers'
import { PrismaSessionsRepository } from '../repository/prisma/prisma-sessions-repository'
import { PrismaExternalUserAccountsRepository } from '../repository/prisma/prisma-external-user-accounts-repository'
import { GoogleAuthGateway } from '../gateway/google-auth-gateway'
import { RefreshGoogleAccessTokenUseCase } from '@/backend/application/refresh-google-access-token'
import { logoutAction } from './logout-action'
import { revalidateTag } from 'next/cache'

export async function refreshGoogleAccessTokenAction() {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    try {
        if (!sessionToken) {
            throw new UnauthorizedError('missing-session')
        }

        const sessionsRepository = new PrismaSessionsRepository()
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository()
        const googleAuthGateway = new GoogleAuthGateway()

        const refreshGoogleAccessTokenUseCase =
            new RefreshGoogleAccessTokenUseCase(
                sessionsRepository,
                externalUserAccountsRepository,
                googleAuthGateway,
            )

        await refreshGoogleAccessTokenUseCase.execute({ sessionToken })
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            if (
                error.type === 'missing-session' ||
                error.type === 'session-not-found'
            ) {
                await logoutAction()
            }

            // TODO: como fazer para fazer login novamente pegando o refresh token por popup
            // if (['external-account-not-found', 'external-token-refresh-failed'].includes(error.type)) {
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

    revalidateTag('me')

    return { success: true }
}
