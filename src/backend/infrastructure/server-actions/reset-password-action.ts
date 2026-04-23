'use server'

import { ResetPasswordUseCase } from '@/backend/application/reset-password-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'

export async function resetPasswordAction(_: unknown, formData: FormData) {
    const email = formData.get('email') as string
    const code = formData.get('code') as string
    const newPassword = formData.get('newPassword') as string

    try {
        const useCase = new ResetPasswordUseCase(
            new PrismaUsersRepository(prisma),
        )

        await useCase.execute({ email, code, newPassword })

        return { success: true }
    } catch (error: any) {
        return { success: false, errorType: error.type as string }
    }
}
