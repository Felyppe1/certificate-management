import { NextRequest, NextResponse } from 'next/server'
import { VerifyEmailUseCase } from '@/backend/application/verify-email-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { env } from '@/env'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME } from '../../_utils/constants'
import { SESSION_EXPIRY_DAYS } from '@/backend/domain/session'

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token')
    console.log('TES', request.url)

    if (!token) {
        return NextResponse.redirect(
            new URL('/entrar?error=verification-token-not-found', request.url),
        )
    }

    try {
        const usersRepository = new PrismaUsersRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const transactionManager = new PrismaTransactionManager(prisma)

        const useCase = new VerifyEmailUseCase(
            usersRepository,
            sessionsRepository,
            transactionManager,
        )

        const result = await useCase.execute({ token })

        const cookie = await cookies()

        cookie.set(SESSION_COOKIE_NAME, result.sessionToken, {
            // secure: true,
            httpOnly: true,
            path: '/',
            maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
            // sameSite: "strict"
        })

        return NextResponse.redirect(env.NEXT_PUBLIC_BASE_URL)
    } catch (error: any) {
        const errorType: string = error?.type ?? 'unknown-error'

        return NextResponse.redirect(
            `${env.NEXT_PUBLIC_BASE_URL}/entrar?error=${errorType}`,
        )
    }
}
