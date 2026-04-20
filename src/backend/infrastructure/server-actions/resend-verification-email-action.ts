'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { ResendVerificationEmailUseCase } from '@/backend/application/resend-verification-email-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaUsersRepository } from '../repository/prisma/prisma-users-repository'
import { ResendNotificationGateway } from '../gateway/resend-notification-gateway'
import { prisma } from '../repository/prisma'
import { logoutAction } from './logout-action'
import { redirect } from 'next/navigation'

export async function resendVerificationEmailAction() {
    try {
        const { userId } = await validateSessionToken()

        const useCase = new ResendVerificationEmailUseCase(
            new PrismaUsersRepository(prisma),
            new ResendNotificationGateway(),
        )

        await useCase.execute({ userId })

        return { success: true }
    } catch (error: any) {
        if (error instanceof AuthenticationError) {
            await logoutAction()
            redirect(`/entrar?error=${error.type}`)
        }
        return { success: false, errorType: error.type }
    }
}
