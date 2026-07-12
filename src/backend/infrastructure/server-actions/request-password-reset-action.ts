'use server'

import { RequestPasswordResetUseCase } from '@/backend/application/request-password-reset-use-case'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { BrevoNotificationGateway } from '@/backend/interface-adapters/gateway/brevo-notification-gateway'
import { prisma } from '@/backend/infrastructure/repository/prisma'

export async function requestPasswordResetAction(
    _: unknown,
    formData: FormData,
) {
    const email = formData.get('email') as string

    try {
        const useCase = new RequestPasswordResetUseCase(
            new PrismaUsersRepository(prisma),
            new BrevoNotificationGateway(),
        )

        await useCase.execute({ email })

        return { success: true }
    } catch (error: any) {
        return { success: false, errorType: error.type as string }
    }
}
