import { LogoutUseCase } from '@/backend/application/logout-use-case'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { SESSION_COOKIE_NAME } from '@/app/api/_utils/constants'
import { env } from '@/env'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null

    if (sessionToken) {
        try {
            const sessionsRepository = new PrismaSessionsRepository(prisma)
            const logoutUseCase = new LogoutUseCase(sessionsRepository)
            await logoutUseCase.execute(sessionToken)
        } catch {
            // sessão não encontrada ou expirada — seguir com redirect
        }
    }

    const res = NextResponse.redirect(
        new URL('/entrar', env.NEXT_PUBLIC_BASE_URL),
    )
    res.cookies.delete(SESSION_COOKIE_NAME)
    return res
}
