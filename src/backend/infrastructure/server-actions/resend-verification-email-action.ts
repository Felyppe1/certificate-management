'use server'

import { ResendVerificationEmailUseCase } from '@/backend/application/resend-verification-email-use-case'
import { PrismaUsersRepository } from '../../interface-adapters/repository/prisma/write/prisma-users-repository'
import { BrevoNotificationGateway } from '../../interface-adapters/gateway/brevo-notification-gateway'
import { prisma } from '../repository/prisma'

export async function resendVerificationEmailAction(
    _: unknown,
    formData: FormData,
) {
    const email = formData.get('email') as string

    try {
        const useCase = new ResendVerificationEmailUseCase(
            new PrismaUsersRepository(prisma),
            new BrevoNotificationGateway(),
        )

        await useCase.execute({ email })

        return { success: true }
    } catch (error: any) {
        return { success: false, errorType: error.type }
    }
}
