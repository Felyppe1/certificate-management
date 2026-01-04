'use server'

import { NextRequest, NextResponse } from 'next/server'
import { SignUpUseCase } from '@/backend/application/sign-up-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { signUpSchema } from '@/backend/infrastructure/server-actions/schemas'

export async function POST(
    request: NextRequest,
): Promise<NextResponse<null | HandleErrorResponse>> {
    try {
        const body = await request.json()
        const parsed = signUpSchema.parse(body)

        const usersRepository = new PrismaUsersRepository(prisma)

        const signUpUseCase = new SignUpUseCase(usersRepository)

        await signUpUseCase.execute({
            name: parsed.name,
            email: parsed.email,
            password: parsed.password,
        })

        return new NextResponse(null, { status: 201 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
