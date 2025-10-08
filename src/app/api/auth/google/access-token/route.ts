import { RefreshGoogleAccessTokenUseCase } from '@/backend/application/refresh-google-access-token'
import { UnauthorizedError } from '@/backend/domain/error/unauthorized-error'
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

        const accessToken = await refreshGoogleAccessTokenUseCase.execute({
            sessionToken,
        })

        return NextResponse.json({ accessToken })
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }

        return NextResponse.json(
            { error: 'Failed to retrieve access token' },
            { status: 500 },
        )
    }
}
