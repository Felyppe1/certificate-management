'use server'

import { ConfirmLinkGoogleToSystemAccountUseCase } from '@/backend/application/confirm-link-google-to-system-account-use-case'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-sessions-repository'
import { PrismaTransactionManager } from '@/backend/interface-adapters/repository/prisma/prisma-transaction-manager'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { setSessionCookie } from '@/app/api/_utils/set-session-cookie'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { redirect } from 'next/navigation'

export async function confirmLinkGoogleAction() {
    try {
        const { userId } = await validateSessionToken()

        const useCase = new ConfirmLinkGoogleToSystemAccountUseCase(
            new PrismaUsersRepository(prisma),
            new PrismaSessionsRepository(prisma),
            new PrismaTransactionManager(prisma),
        )

        const sessionToken = await useCase.execute({ userId })

        await setSessionCookie(sessionToken)

        return { success: true as const }
    } catch (error: any) {
        console.log(error)
        if (error instanceof AuthenticationError) {
            await logoutAction()
            redirect(`/entrar?error=${error.type}`)
        }
        return {
            success: false as const,
            errorType: error.type ?? 'unknown-error',
        }
    }
}
