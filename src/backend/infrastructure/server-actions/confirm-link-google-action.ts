'use server'

import { ConfirmLinkGoogleToSystemAccountUseCase } from '@/backend/application/confirm-link-google-to-system-account-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { SESSION_COOKIE_NAME } from '@/app/api/_utils/constants'
import { SESSION_EXPIRY_DAYS } from '@/backend/domain/session'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { cookies } from 'next/headers'
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

        const cookie = await cookies()
        cookie.set(SESSION_COOKIE_NAME, sessionToken, {
            httpOnly: true,
            path: '/',
            maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
        })

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
