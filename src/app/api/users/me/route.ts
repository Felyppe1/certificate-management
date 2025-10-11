import { GetMeUseCase } from '@/backend/application/get-me-use-case'
import { Provider } from '@/backend/application/interfaces/iexternal-user-accounts-repository'
import { NotFoundError } from '@/backend/domain/error/not-found-error'
import { UnauthorizedError } from '@/backend/domain/error/unauthorized-error'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

export async function GET(): Promise<
    NextResponse<GetMeControllerResponse | { type: string; title: string }>
> {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    try {
        if (!sessionToken) {
            throw new UnauthorizedError('missing-session')
        }

        const sessionsRepository = new PrismaSessionsRepository()
        const usersRepository = new PrismaUsersRepository()
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository()

        const getMeUseCase = new GetMeUseCase(
            sessionsRepository,
            usersRepository,
            externalUserAccountsRepository,
        )

        const user = await getMeUseCase.execute({ sessionToken })

        return NextResponse.json({ user })
    } catch (error: any) {
        if (error instanceof NotFoundError) {
            return NextResponse.json(
                { type: 'user-not-found', title: 'User not found' },
                { status: 404 },
            )
        }

        if (error instanceof UnauthorizedError) {
            return NextResponse.json(
                { type: error.type, title: error.title },
                { status: 401 },
            )
        }

        return NextResponse.json(
            {
                type: 'internal-server-error',
                title: 'An unexpected error occurred while getting the user',
            },
            { status: 500 },
        )
    }
}
