'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { SetSystemLoginUseCase } from '@/backend/application/set-system-login-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaUsersRepository } from '../repository/prisma/prisma-users-repository'
import { BrevoNotificationGateway } from '../gateway/brevo-notification-gateway'
import { prisma } from '../repository/prisma'
import { logoutAction } from './logout-action'
import { redirect } from 'next/navigation'
import { setupSystemCredentialsSchema } from './schemas'

export async function setSystemLoginAction(_: unknown, formData: FormData) {
    const rawData = {
        email: formData.get('email') as string,
        passwordPlain: formData.get('password') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsed = setupSystemCredentialsSchema.parse(rawData)

        const useCase = new SetSystemLoginUseCase(
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
