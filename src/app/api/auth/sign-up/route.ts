'use server'

import { NextRequest } from 'next/server'
import { SignUpUseCase } from '@/backend/application/sign-up-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { handleError } from '@/utils/handle-error'
import z from 'zod'

const signUpSchema = z.object({
    email: z.email('Invalid email format'),
    name: z.string().min(1, 'Name is required'),
    password: z
        .string()
        .min(6, 'Password must have at least 6 characters')
        .max(100, 'Password must have at most 100 characters'),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const parsed = signUpSchema.parse(body)

        const usersRepository = new PrismaUsersRepository()

        const signUpUseCase = new SignUpUseCase(usersRepository)

        await signUpUseCase.execute({
            name: parsed.name,
            email: parsed.email,
            password: parsed.password,
        })

        return new Response(null, { status: 201 })
    } catch (error: any) {
        await handleError(error)
    }
}
