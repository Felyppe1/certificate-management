import { RefreshGoogleAccessTokenUseCase } from '@/backend/application/refresh-google-access-token'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { handleError } from '@/utils/handle-error'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const sessionToken = await getSessionToken(request)

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
        return await handleError(error)
    }
}
