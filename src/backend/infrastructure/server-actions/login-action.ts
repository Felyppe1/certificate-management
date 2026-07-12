'use server'

import { LoginUseCase } from '@/backend/application/login-use-case'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { redirect } from 'next/navigation'
import { loginSchema } from './schemas'
import { setSessionCookie } from '@/app/api/_utils/set-session-cookie'

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

        await setSessionCookie(result.token)
    } catch (error: any) {
        console.log(error)
        return {
            success: false,
            errorType: error.type,
        }
    }

    redirect('/')
}
