import { LoginUseCase } from "@/backend/application/login-use-case"
import { PrismaSessionsRepository } from "@/backend/infrastructure/repository/prisma/prisma-sessions-repository"
import { PrismaUsersRepository } from "@/backend/infrastructure/repository/prisma/prisma-users-repository"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const runtime = 'nodejs'

export const SESSION_COOKIE_KEY = 'session_token'

interface LoginResponse {
    id: string
    email: string
    name: string
}

export async function POST(request: Request): Promise<NextResponse<LoginResponse>> {
    const { email, password } = await request.json()

    const usersRepository = new PrismaUsersRepository()
    const sessionsRepository = new PrismaSessionsRepository()

    const loginUseCase = new LoginUseCase(usersRepository, sessionsRepository)

    const result = await loginUseCase.execute(email, password)

    const cookie = await cookies()

    cookie.set(
        SESSION_COOKIE_KEY,
        result.token,
        {
            // secure: true,
            httpOnly: true,
            path: "/",
            // sameSite: "strict"
        }
    )

    return NextResponse.json(result.user)
}