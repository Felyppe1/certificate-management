import { RefreshGoogleAccessTokenUseCase } from '@/backend/application/refresh-google-access-token'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    try {
        if (!sessionToken) {
            throw new AuthenticationError('missing-session')
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

        const accessToken = await refreshGoogleAccessTokenUseCase.execute({
            sessionToken,
        })

        return NextResponse.json({ accessToken })
    } catch (error) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json(
                { type: error.type, title: error.title },
                { status: 401 },
            )
        }

        return NextResponse.json(
            {
                type: 'internal-server-error',
                title: 'An unexpected error occurred while refreshing the access token',
            },
            { status: 500 },
        )
    }
}
