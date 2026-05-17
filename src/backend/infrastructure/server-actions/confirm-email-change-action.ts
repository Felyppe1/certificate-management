'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { ConfirmEmailChangeUseCase } from '@/backend/application/confirm-email-change-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaUsersRepository } from '../repository/prisma/prisma-users-repository'
import { prisma } from '../repository/prisma'
import { logoutAction } from './logout-action'
import { redirect } from 'next/navigation'
import { confirmEmailChangeSchema } from './schemas'

export async function confirmEmailChangeAction(_: unknown, formData: FormData) {
    const rawData = {
        code: formData.get('code') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsed = confirmEmailChangeSchema.parse(rawData)

        const useCase = new ConfirmEmailChangeUseCase(
            new PrismaUsersRepository(prisma),
        )

        const { newEmail } = await useCase.execute({ userId, ...parsed })

        return { success: true, newEmail }
    } catch (error: any) {
        if (error instanceof AuthenticationError) {
            await logoutAction()
            redirect(`/entrar?error=${error.type}`)
        }
        return { success: false, errorType: error.type }
    }
}
