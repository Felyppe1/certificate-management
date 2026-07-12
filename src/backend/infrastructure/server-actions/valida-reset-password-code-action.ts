'use server'

import { ValidateResetPasswordCodeUseCase } from '@/backend/application/valida-reset-password-code-use-case'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'

export async function validateResetPasswordCodeAction(
    _: unknown,
    formData: FormData,
) {
    const email = formData.get('email') as string
    const code = formData.get('code') as string

    try {
        const useCase = new ValidateResetPasswordCodeUseCase(
            new PrismaUsersRepository(prisma),
        )

        await useCase.execute({ email, code })

        return { success: true }
    } catch (error: any) {
        return { success: false, errorType: error.type as string }
    }
}
