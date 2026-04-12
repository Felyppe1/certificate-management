import { RefreshGoogleAccessTokenUseCase } from '@/backend/application/refresh-google-access-token-use-case'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { handleError, HandleErrorResponse } from '@/app/api/_utils/handle-error'
import { NextRequest, NextResponse } from 'next/server'
import { validateServiceAccountToken } from '@/app/api/_middleware/validateServiceAccountToken'
import z from 'zod'

const bodySchema = z.object({
    userId: z.string().min(1),
})

export interface RefreshGoogleAccessTokenControllerResponse {
    accessToken: string
}

export async function POST(
    request: NextRequest,
): Promise<
    NextResponse<
        RefreshGoogleAccessTokenControllerResponse | HandleErrorResponse
    >
> {
    try {
        await validateServiceAccountToken(request)

        const body = await request.json()

        const { userId } = bodySchema.parse(body)

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
    } catch (error: unknown) {
        return await handleError(error)
    }
}
