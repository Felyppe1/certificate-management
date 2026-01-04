'use server'

import { LoginUseCase } from '@/backend/application/login-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'

export interface GetSessionControllerResponse {
    token: string
    userId: string
}

export async function GET(
    request: NextRequest,
): Promise<NextResponse<GetSessionControllerResponse | HandleErrorResponse>> {
    try {
        const session = await validateSessionToken(request)

        return NextResponse.json(session)
    } catch (error: unknown) {
        return await handleError(error)
    }
}

export interface LoginSessionControllerResponse {
    id: string
    email: string
    name: string
}

export async function POST(
    request: Request,
): Promise<NextResponse<LoginSessionControllerResponse | HandleErrorResponse>> {
    try {
        const { email, password } = await request.json()

        const usersRepository = new PrismaUsersRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)

        const loginUseCase = new LoginUseCase(
            usersRepository,
            sessionsRepository,
        )

        const result = await loginUseCase.execute(email, password)

        const cookie = await cookies()

        cookie.set('session_token', result.token, {
            // secure: true,
            httpOnly: true,
            path: '/',
            // sameSite: "strict"
        })

        return NextResponse.json(result.user)
    } catch (error: unknown) {
        return await handleError(error)
    }
}
