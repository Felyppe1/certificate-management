'use server'

import { ResetPasswordUseCase } from '@/backend/application/reset-password-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { resetPasswordSchema } from './schemas'

export async function resetPasswordAction(_: unknown, formData: FormData) {
    const rawData = {
        email: formData.get('email') as string,
        code: formData.get('code') as string,
        newPassword: formData.get('newPassword') as string,
    }

    try {
        const { email, code, newPassword } = resetPasswordSchema.parse(rawData)

        const useCase = new ResetPasswordUseCase(
            new PrismaUsersRepository(prisma),
        )

        await useCase.execute({ email, code, newPassword })

        return { success: true }
    } catch (error: any) {
        return { success: false, errorType: error.type as string }
    }
}
