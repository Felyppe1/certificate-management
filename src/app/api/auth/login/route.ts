'use server'

import { NextRequest } from 'next/server'
import { LoginUseCase } from '@/backend/application/login-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { handleError } from '@/utils/handle-error'
import z from 'zod'

const loginSchema = z.object({
    email: z.email('Invalid email format'),
    password: z
        .string()
        .min(2, 'Password must have at least 6 characters')
        .max(100, 'Password must have at most 100 characters'),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const parsed = loginSchema.parse(body)

        const usersRepository = new PrismaUsersRepository()
        const sessionsRepository = new PrismaSessionsRepository()

        const loginUseCase = new LoginUseCase(
            usersRepository,
            sessionsRepository,
        )

        const result = await loginUseCase.execute(parsed.email, parsed.password)

        return Response.json(
            { token: result.token },
            {
                status: 200,
                headers: {
                    'Set-Cookie': `session_token=${result.token}; HttpOnly; Path=/; SameSite=Strict`,
                },
            },
        )
    } catch (error: any) {
        await handleError(error)
    }
}
