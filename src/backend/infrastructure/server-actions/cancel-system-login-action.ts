'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { CancelSystemLoginUseCase } from '@/backend/application/cancel-system-login-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaUsersRepository } from '../repository/prisma/prisma-users-repository'
import { prisma } from '../repository/prisma'
import { logoutAction } from './logout-action'
import { redirect } from 'next/navigation'

export async function cancelSystemLoginAction() {
    try {
        const { userId } = await validateSessionToken()

        const useCase = new CancelSystemLoginUseCase(
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
