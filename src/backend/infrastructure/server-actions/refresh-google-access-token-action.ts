'use server'

import { UnauthorizedError } from '@/backend/domain/error/unauthorized-error'
import { cookies } from 'next/headers'
import { PrismaSessionsRepository } from '../repository/prisma/prisma-sessions-repository'
import { PrismaExternalUserAccountsRepository } from '../repository/prisma/prisma-external-user-accounts-repository'
import { GoogleAuthGateway } from '../gateway/google-auth-gateway'
import { RefreshGoogleAccessTokenUseCase } from '@/backend/application/refresh-google-access-token'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { logoutAction } from './logout-action'
import { revalidateTag } from 'next/cache'
import { prisma } from '../repository/prisma'

export async function refreshGoogleAccessTokenAction() {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    try {
        if (!sessionToken) {
            throw new UnauthorizedError('Session token not present')
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
        // TODO: tem 3 tipos de unauthorized: sessão não existe (fazer logout), conta externa não existe (conectar conta do google) ou não conseguiu fazer refresh do token (conectar conta do google)
        if (error instanceof UnauthorizedError) {
            return {
                success: false,
            }
        }
    }

    revalidateTag('me')

    return { success: true }
}
