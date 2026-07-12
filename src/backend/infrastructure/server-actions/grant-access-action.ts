'use server'

import { GrantAccessUseCase } from '@/backend/application/grant-access-use-case'
import { BrevoNotificationGateway } from '@/backend/interface-adapters/gateway/brevo-notification-gateway'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { redirect } from 'next/navigation'
import z from 'zod'

const grantAccessSchema = z.object({
    email: z.email(),
})

export async function grantAccessAction(_: unknown, formData: FormData) {
    const fromForm = formData.get('fromForm') === 'true'
    const isRealCase = formData.get('isRealCase') === 'true'

    try {
        const { userId } = await validateSessionToken()

        const parsedData = grantAccessSchema.parse({
            email: formData.get('email') as string,
        })

        const notificationEmailGateway = new BrevoNotificationGateway()
        const usersRepository = new PrismaUsersRepository(prisma)

        const useCase = new GrantAccessUseCase(
            notificationEmailGateway,
            usersRepository,
        )

        await useCase.execute({
            email: parsedData.email,
            userId,
            fromForm,
            isRealCase,
        })

        return { success: true }
    } catch (error: any) {
        if (error instanceof AuthenticationError) {
            await logoutAction()
            redirect(`/entrar?error=${error.type}`)
        }

        return {
            success: false,
            errorType: error.type,
        }
    }
}
