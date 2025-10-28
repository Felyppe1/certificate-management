import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { LoginGoogleUseCase } from '@/backend/application/login-google-use-case'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)

    const code = searchParams.get('code')

    if (!code) {
        return NextResponse.redirect(
            process.env.NEXT_PUBLIC_BASE_URL + '/entrar',
        )
    }

    const usersRepository = new PrismaUsersRepository(prisma)
    const externalUserAccountsRepository =
        new PrismaExternalUserAccountsRepository(prisma)
    const sessionsRepository = new PrismaSessionsRepository(prisma)
    const googleAuthGateway = new GoogleAuthGateway()

    const loginGoogleUseCase = new LoginGoogleUseCase(
        usersRepository,
        externalUserAccountsRepository,
        sessionsRepository,
        googleAuthGateway,
    )

    try {
        const sessionToken = await loginGoogleUseCase.execute({ code })

        const cookie = await cookies()

        cookie.set('session_token', sessionToken, {
            httpOnly: true,
            path: '/',
            // secure: true,
            // sameSite: "strict" // TODO: use sameSite
        })

        return NextResponse.redirect(process.env.NEXT_PUBLIC_BASE_URL + '/')
    } catch (error) {
        console.error(error)
        return NextResponse.redirect(
            process.env.NEXT_PUBLIC_BASE_URL + '/entrar',
        )
    }
}
