'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { CancelEmailChangeUseCase } from '@/backend/application/cancel-email-change-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaUsersRepository } from '../repository/prisma/prisma-users-repository'
import { prisma } from '../repository/prisma'
import { logoutAction } from './logout-action'
import { redirect } from 'next/navigation'

export async function cancelEmailChangeAction() {
    try {
        const { userId } = await validateSessionToken()

        const useCase = new CancelEmailChangeUseCase(
            new PrismaUsersRepository(prisma),
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
