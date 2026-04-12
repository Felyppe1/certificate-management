import { SESSION_COOKIE_NAME } from '@/app/api/_utils/constants'

;('use server')

import { LogoutUseCase } from '@/backend/application/logout-use-case'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { cookies } from 'next/headers'

export async function logoutAction() {
    const cookie = await cookies()

    const sessionToken = cookie.get(SESSION_COOKIE_NAME)?.value

    if (!sessionToken) {
        return {
            success: true,
        }
    }

    try {
        const sessionsRepository = new PrismaSessionsRepository(prisma)

        const logoutUseCase = new LogoutUseCase(sessionsRepository)

        await logoutUseCase.execute(sessionToken)
    } catch (error) {
        console.log('Error during logout:', error)
        // TODO: enviar para acompanhamento
    } finally {
        cookie.delete(SESSION_COOKIE_NAME)

        return {
            success: true,
        }
    }
}
