'use server'

import { LoginUseCase } from "@/backend/application/login-use-case"
import { PrismaSessionsRepository } from "@/backend/infrastructure/repository/prisma/prisma-sessions-repository"
import { PrismaUsersRepository } from "@/backend/infrastructure/repository/prisma/prisma-users-repository"
import { ActionResponse } from "@/types"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z, ZodError } from "zod"

interface LoginActionInput {
    email: string
    password: string
}

const loginSchema = z.object({
    email: z.email('Formato de email inválido'),
    password: z.string().min(2, 'Senha deve ter pelo menos 6 caracteres').max(100, 'Senha deve ter no máximo 100 caracteres'),
})

export async function loginAction(_: unknown, formData: FormData): Promise<ActionResponse<LoginActionInput>> {
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const rawData: LoginActionInput = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    try {
        const parsedData = loginSchema.parse(rawData)

        const usersRepository = new PrismaUsersRepository()
        const sessionsRepository = new PrismaSessionsRepository()

        const loginUseCase = new LoginUseCase(usersRepository, sessionsRepository)

        const result = await loginUseCase.execute(parsedData.email, parsedData.password)

        const cookie = await cookies()

        console.log('RESULT', result)
        cookie.set(
            'session_token',
            result.token,
            {
                httpOnly: true,
                path: "/",
                // secure: true,
                // sameSite: "strict"
            }
        )
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                message: 'Por favor, corrija os erros no formulário.',
                errors: z.flattenError(error as ZodError<LoginActionInput>).fieldErrors,
                inputs: rawData
            }
        }

        if (error instanceof Error && error.message === 'Unauthorized') {
            return {
                success: false,
                message: 'Email ou senha incorretos.',
                inputs: {
                    email: rawData.email
                }
            }
        }
        
        return {
            success: false,
            message: 'Ocorreu um erro inesperado. Tente novamente.',
            inputs: rawData
        }
    }

    redirect('/')
}