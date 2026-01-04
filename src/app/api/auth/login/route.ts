'use server'

import { NextRequest, NextResponse } from 'next/server'
import { LoginUseCase } from '@/backend/application/login-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { loginSchema } from '@/backend/infrastructure/server-actions/schemas'

export interface LoginControllerResponse {
    token: string
}

export async function POST(
    request: NextRequest,
): Promise<NextResponse<LoginControllerResponse | HandleErrorResponse>> {
    try {
        const body = await request.json()
        const parsed = loginSchema.parse(body)

        const usersRepository = new PrismaUsersRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)

        const loginUseCase = new LoginUseCase(
            usersRepository,
            sessionsRepository,
        )

        const result = await loginUseCase.execute(parsed.email, parsed.password)

        return NextResponse.json(
            { token: result.token },
            {
                status: 200,
                headers: {
                    'Set-Cookie': `session_token=${result.token}; HttpOnly; Path=/; SameSite=Strict`,
                },
            },
        )
    } catch (error: unknown) {
        return await handleError(error)
    }
}
