import { GetMeUseCase } from '@/backend/application/get-me-use-case'
import { Provider } from '@/backend/domain/external-account'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { handleError, HandleErrorResponse } from '@/app/api/_utils/handle-error'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'

export interface GetMeResponse {
    user: {
        id: string
        email: string | null
        isEmailVerified: boolean
        name: string
        credits: number
        externalAccounts: {
            provider: Provider
            providerUserId: string
            email: string
            accessToken: string
            accessTokenExpiryDateTime: Date | null
        }[]
        emailChangeCode: {
            newEmail: string
            expiresAt: Date
        } | null
    }
}

export async function GET(
    request: NextRequest,
): Promise<NextResponse<GetMeResponse | HandleErrorResponse>> {
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
