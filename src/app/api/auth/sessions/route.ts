'use server'

import { LoginUseCase } from '@/backend/application/login-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { UnauthorizedError } from '@/backend/domain/error/unauthorized-error'

export async function GET() {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    try {
        if (!sessionToken) {
            throw new UnauthorizedError('missing-session')
            // return new NextResponse('No session token', { status: 401 })
        }

        const session = await new PrismaSessionsRepository().getById(
            sessionToken,
        )

        if (!session) {
            throw new UnauthorizedError('session-not-found')
        }

        return NextResponse.json(session)
    } catch (error: any) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json(
                {
                    type: error.type,
                    title: error.title,
                },
                { status: 401 },
            )
        }

        return NextResponse.json(
            {
                type: 'internal-server-error',
                title: 'An unexpected error occurred while getting the session',
            },
            { status: 500 },
        )
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

    const usersRepository = new PrismaUsersRepository()
    const sessionsRepository = new PrismaSessionsRepository()

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
