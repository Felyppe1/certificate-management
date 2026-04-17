import { SESSION_COOKIE_NAME } from '@/app/api/_utils/constants'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { env } from '@/env'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { LoginGoogleUseCase } from '@/backend/application/login-google-use-case'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { AppError } from '@/backend/domain/error/app-error'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { SESSION_EXPIRY_DAYS } from '@/backend/domain/session'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)

    const code = searchParams.get('code')

    if (!code) {
        return NextResponse.redirect(env.NEXT_PUBLIC_BASE_URL + '/entrar')
    }

    const usersRepository = new PrismaUsersRepository(prisma)
    const sessionsRepository = new PrismaSessionsRepository(prisma)
    const googleAuthGateway = new GoogleAuthGateway()
    const transactionManager = new PrismaTransactionManager(prisma)

    const loginGoogleUseCase = new LoginGoogleUseCase(
        usersRepository,
        sessionsRepository,
        googleAuthGateway,
        transactionManager,
    )

    try {
        const sessionToken = await loginGoogleUseCase.execute({
            code,
            reAuthenticate: false,
        })

        const cookie = await cookies()

        cookie.set(SESSION_COOKIE_NAME, sessionToken, {
            httpOnly: true,
            path: '/',
            maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
            // secure: true,
            // sameSite: "strict" // TODO: use sameSite
        })

        return NextResponse.redirect(env.NEXT_PUBLIC_BASE_URL + '/')
    } catch (error) {
        console.error(error)
        const redirectUrl = new URL(env.NEXT_PUBLIC_BASE_URL + '/entrar')

        if (error instanceof AppError) {
            redirectUrl.searchParams.set('error', error.type)
        } else {
            redirectUrl.searchParams.set('error', 'unknown-error')
        }

        return NextResponse.redirect(redirectUrl)
    }
}
