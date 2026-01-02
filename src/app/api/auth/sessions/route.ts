'use server'

import { LoginUseCase } from '@/backend/application/login-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { handleError } from '@/utils/handle-error'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'

export async function GET(request: NextRequest) {
    try {
        const { token } = await validateSessionToken(request)

        const session = await new PrismaSessionsRepository(prisma).getById(
            token,
        )

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        return NextResponse.json(session)
    } catch (error: any) {
        return await handleError(error)
    }
}

interface LoginResponse {
    id: string
    email: string
    name: string
}

export async function POST(
    request: Request,
): Promise<NextResponse<LoginResponse>> {
    const { email, password } = await request.json()

    const usersRepository = new PrismaUsersRepository(prisma)
    const sessionsRepository = new PrismaSessionsRepository(prisma)

    const loginUseCase = new LoginUseCase(usersRepository, sessionsRepository)

    const result = await loginUseCase.execute(email, password)

    const cookie = await cookies()

    cookie.set('session_token', result.token, {
        // secure: true,
        httpOnly: true,
        path: '/',
        // sameSite: "strict"
    })

    return NextResponse.json(result.user)
}
