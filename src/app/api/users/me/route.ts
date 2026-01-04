import { GetMeUseCase } from '@/backend/application/get-me-use-case'
import { Provider } from '@/backend/application/interfaces/iexternal-user-accounts-repository'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { handleError } from '@/utils/handle-error'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'

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
        const { token } = await validateSessionToken(request)

        const usersRepository = new PrismaUsersRepository(prisma)
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)

        const getMeUseCase = new GetMeUseCase(
            usersRepository,
            externalUserAccountsRepository,
        )

        const user = await getMeUseCase.execute({ userId: token })

        return NextResponse.json({ user })
    } catch (error: any) {
        return await handleError(error)
    }
}
