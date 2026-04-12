import { RefreshGoogleAccessTokenUseCase } from '@/backend/application/refresh-google-access-token-use-case'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { handleError } from '@/app/api/_utils/handle-error'
import { NextRequest, NextResponse } from 'next/server'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'

export async function POST(request: NextRequest) {
    try {
        const { userId } = await validateSessionToken(request)

        const usersRepository = new PrismaUsersRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()

        const refreshGoogleAccessTokenUseCase =
            new RefreshGoogleAccessTokenUseCase(
                usersRepository,
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
