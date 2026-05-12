'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { UpdateSystemEmailUseCase } from '@/backend/application/update-system-email-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaUsersRepository } from '../repository/prisma/prisma-users-repository'
import { BrevoNotificationGateway } from '../gateway/brevo-notification-gateway'
import { prisma } from '../repository/prisma'
import { logoutAction } from './logout-action'
import { redirect } from 'next/navigation'
import { updateSystemEmailSchema } from './schemas'

export async function updateSystemEmailAction(_: unknown, formData: FormData) {
    const rawData = {
        newEmail: formData.get('newEmail') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsed = updateSystemEmailSchema.parse(rawData)

        const useCase = new UpdateSystemEmailUseCase(
            new PrismaUsersRepository(prisma),
            new BrevoNotificationGateway(),
        )

        const { hasOtherLoginMethod } = await useCase.execute({
            userId,
            ...parsed,
        })

        if (!hasOtherLoginMethod) {
            await logoutAction()
            return { success: true, wasLoggedOut: true }
        }

        return { success: true, wasLoggedOut: false }
    } catch (error: any) {
        if (error instanceof AuthenticationError) {
            await logoutAction()
            redirect(`/entrar?error=${error.type}`)
        }
        return { success: false, errorType: error.type }
    }
}
