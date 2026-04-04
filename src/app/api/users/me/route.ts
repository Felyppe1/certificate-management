import { GetMeUseCase } from '@/backend/application/get-me-use-case'
import { Provider } from '@/backend/domain/external-account'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'

export interface GetMeControllerResponse {
    user: {
        id: string
        email: string
        name: string
        credits: number
        externalAccounts: {
            provider: Provider
            providerUserId: string
            accessToken: string
            accessTokenExpiryDateTime: Date | null
        }[]
    }
}

export async function GET(
    request: NextRequest,
): Promise<NextResponse<GetMeControllerResponse | HandleErrorResponse>> {
    try {
        const { userId } = await validateSessionToken(request)

        const usersRepository = new PrismaUsersRepository(prisma)

        const getMeUseCase = new GetMeUseCase(usersRepository)

        const user = await getMeUseCase.execute({ userId })

        return NextResponse.json({ user })
    } catch (error: any) {
        return await handleError(error)
    }
}
