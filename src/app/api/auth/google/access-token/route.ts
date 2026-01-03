import { RefreshGoogleAccessTokenUseCase } from '@/backend/application/refresh-google-access-token-use-case'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { handleError } from '@/utils/handle-error'
import { NextRequest, NextResponse } from 'next/server'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'

export async function POST(request: NextRequest) {
    try {
        const { userId } = await validateSessionToken(request)

        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()

        const refreshGoogleAccessTokenUseCase =
            new RefreshGoogleAccessTokenUseCase(
                externalUserAccountsRepository,
                googleAuthGateway,
            )

        const accessToken = await refreshGoogleAccessTokenUseCase.execute({
            userId,
        })

        return NextResponse.json({ accessToken })
    } catch (error) {
        return await handleError(error)
    }
}
