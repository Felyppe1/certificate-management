'use server'

import { SignUpUseCase } from '@/backend/application/sign-up-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { ActionResponse } from '@/types'
import { redirect } from 'next/navigation'
import { z, ZodError } from 'zod'

interface SignUpActionInput {
    name: string
    email: string
    password: string
}

const signUpSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Formato de email inválido'),
    password: z
        .string()
        .min(6, 'Senha deve ter pelo menos 6 caracteres')
        .max(100, 'Senha deve ter no máximo 100 caracteres'),
})

export async function signUpAction(
    _: unknown,
    formData: FormData,
): Promise<ActionResponse<SignUpActionInput>> {
    const rawData: SignUpActionInput = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    try {
        const parsedData = signUpSchema.parse(rawData)

        const usersRepository = new PrismaUsersRepository(prisma)
        const signUpUseCase = new SignUpUseCase(usersRepository)

        await signUpUseCase.execute({
            name: parsedData.name,
            email: parsedData.email,
            password: parsedData.password,
        })
    } catch (error) {
        if (error instanceof ZodError) {
            return {
                success: false,
                message: 'Por favor, corrija os erros no formulário.',
                errors: z.flattenError(error as ZodError<SignUpActionInput>)
                    .fieldErrors,
                inputs: rawData,
            }
        }

        if (error instanceof Error) {
            return {
                success: false,
                message: error.message,
                inputs: rawData,
            }
        }

        return {
            success: false,
            message: 'Ocorreu um erro inesperado. Tente novamente.',
            inputs: rawData,
        }
    }

    redirect('/entrar')
}
