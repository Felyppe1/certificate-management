'use server'

import { GrantAccessUseCase } from '@/backend/application/grant-access-use-case'
import { ResendNotificationEmailGateway } from '@/backend/infrastructure/gateway/resend-notification-email-gateway'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { redirect } from 'next/navigation'
import z from 'zod'

interface GrantAccessActionInput {
    email: string
}

const grantAccessSchema = z.object({
    email: z.email(),
})

export async function grantAccessAction(_: unknown, formData: FormData) {
    const rawData: GrantAccessActionInput = {
        email: formData.get('email') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = grantAccessSchema.parse(rawData)

        const notificationEmailGateway = new ResendNotificationEmailGateway()
        const usersRepository = new PrismaUsersRepository(prisma)

        const useCase = new GrantAccessUseCase(
            notificationEmailGateway,
            usersRepository,
        )

        await useCase.execute({ email: parsedData.email, userId })

        return { success: true }
    } catch (error: any) {
        if (error instanceof AuthenticationError) {
            if (
                error.type === 'missing-session' ||
                error.type === 'session-not-found' ||
                error.type === 'user-not-found'
            ) {
                await logoutAction()
                redirect(`/entrar?error=${error.type}`)
            }
        }

        return {
            success: false,
            errorType: error.type,
        }
    }
}
