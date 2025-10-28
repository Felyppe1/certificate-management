'use server'

import { LoginUseCase } from '@/backend/application/login-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z, ZodError } from 'zod'

interface LoginInput {
    email: string
    password: string
}

const loginSchema = z.object({
    email: z.email('Email inválido'),
    password: z
        .string()
        .min(6, 'Senha deve ter pelo menos 6 caracteres')
        .max(50, 'Senha deve ter no máximo 50 caracteres'),
})

export async function loginAction(data: LoginInput) {
    try {
        const parsedData = loginSchema.parse(data)

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

        redirect('/')
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                message: 'Por favor, corrija os erros no formulário.',
                errors: z.flattenError(error).fieldErrors,
                inputs: data,
            }
        }

        if (error instanceof Error && error.message === 'Unauthorized') {
            return {
                success: false,
                message: 'Email ou senha incorretos.',
                inputs: {
                    email: data.email,
                },
            }
        }

        return {
            success: false,
            message: 'Ocorreu um erro inesperado. Tente novamente.',
            inputs: data,
        }
    }
}
