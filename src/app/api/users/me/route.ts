import { GetMeUseCase } from '@/backend/application/get-me-use-case'
import { Provider } from '@/backend/application/interfaces/iexternal-user-accounts-repository'
import { NotFoundError } from '@/backend/domain/error/not-found-error'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { handleError } from '@/utils/handle-error'

export interface GetMeControllerResponse {
    user: {
        id: string
        email: string
        name: string
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
): Promise<
    NextResponse<GetMeControllerResponse | { type: string; title: string }>
> {
    try {
        const sessionToken = await getSessionToken(request)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const usersRepository = new PrismaUsersRepository(prisma)
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)

        const getMeUseCase = new GetMeUseCase(
            sessionsRepository,
            usersRepository,
            externalUserAccountsRepository,
        )

        const user = await getMeUseCase.execute({ sessionToken })

        return NextResponse.json({ user })
    } catch (error: any) {
        return await handleError(error)
    }
}
