'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { RequestEmailChangeUseCase } from '@/backend/application/request-email-change-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaUsersRepository } from '../../interface-adapters/repository/prisma/write/prisma-users-repository'
import { BrevoNotificationGateway } from '../../interface-adapters/gateway/brevo-notification-gateway'
import { prisma } from '../repository/prisma'
import { logoutAction } from './logout-action'
import { redirect } from 'next/navigation'
import { requestEmailChangeSchema } from './schemas'

export async function requestEmailChangeAction(_: unknown, formData: FormData) {
    const rawData = {
        newEmail: formData.get('newEmail') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsed = requestEmailChangeSchema.parse(rawData)

        const useCase = new RequestEmailChangeUseCase(
            new PrismaUsersRepository(prisma),
            new BrevoNotificationGateway(),
        )

        await useCase.execute({ userId, ...parsed })

        return { success: true }
    } catch (error: any) {
        if (error instanceof AuthenticationError) {
            await logoutAction()
            redirect(`/entrar?error=${error.type}`)
        }
        return { success: false, errorType: error.type }
    }
}
