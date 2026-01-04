'use server'

import { LoginUseCase } from '@/backend/application/login-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { loginSchema } from './schemas'

export async function loginAction(_: unknown, formData: FormData) {
    const rawData = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    try {
        const parsedData = loginSchema.parse(rawData)

        const usersRepository = new PrismaUsersRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)

        const loginUseCase = new LoginUseCase(
            usersRepository,
            sessionsRepository,
        )

        const result = await loginUseCase.execute(
            parsedData.email,
            parsedData.password,
        )

        const cookie = await cookies()

        cookie.set('session_token', result.token, {
            httpOnly: true,
            path: '/',
            // secure: true,
            // sameSite: "strict"
        })
    } catch (error: any) {
        return {
            success: false,
            errorType: error.type,
        }
    }

    redirect('/')
}
