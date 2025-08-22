'use server'

import { LoginUseCase } from "@/backend/application/login-use-case"
import { PrismaSessionsRepository } from "@/backend/infrastructure/repository/prisma/prisma-sessions-repository"
import { PrismaUsersRepository } from "@/backend/infrastructure/repository/prisma/prisma-users-repository"
import { cookies } from "next/headers"

interface LoginInput {
    email: string
    password: string
}

interface LoginOutput {
    id: string
    email: string
    name: string
}

export default async function login({ email, password }: LoginInput): Promise<LoginOutput> {
    const usersRepository = new PrismaUsersRepository()
    const sessionsRepository = new PrismaSessionsRepository()

    const loginUseCase = new LoginUseCase(usersRepository, sessionsRepository)

    const result = await loginUseCase.execute(email, password)

    const cookie = await cookies()

    cookie.set(
        'session_token',
        result.token,
        {
            // secure: true,
            httpOnly: true,
            path: "/",
            // sameSite: "strict"
        }
    )

    return result.user
}