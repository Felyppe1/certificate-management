'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { UpdateSystemEmailUseCase } from '@/backend/application/update-system-email-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaUsersRepository } from '../repository/prisma/prisma-users-repository'
import { ResendNotificationGateway } from '../gateway/resend-notification-gateway'
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
            new ResendNotificationGateway(),
        )

        await useCase.execute({ userId, ...parsed })

        await logoutAction()

        return { success: true }
    } catch (error: any) {
        if (error instanceof AuthenticationError) {
            await logoutAction()
            redirect(`/entrar?error=${error.type}`)
        }
        return { success: false, errorType: error.type }
    }
}
