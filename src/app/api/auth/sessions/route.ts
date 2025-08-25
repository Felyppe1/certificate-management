'use server'

import { LoginUseCase } from '@/backend/application/login-use-case'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')
    console.log('sessionToken', sessionToken)
    if (!sessionToken) {
        throw new Error('Unauthorized')
        // return new NextResponse('No session token', { status: 401 })
    }

    const session = await new PrismaSessionsRepository().getById(
        sessionToken.value,
    )

    if (!session) {
        throw new Error('Unauthorized')
    }

    return NextResponse.json(session)
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
