'use server'

import { LogoutUseCase } from '@/backend/application/logout-use-case'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function logoutAction() {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    if (!sessionToken) {
        redirect('/entrar')
    }

    try {
        const sessionsRepository = new PrismaSessionsRepository(prisma)

        const logoutUseCase = new LogoutUseCase(sessionsRepository)

        await logoutUseCase.execute(sessionToken)
    } catch (error) {
        console.log('Error during logout:', error)
        // TODO: enviar para acompanhamento
    } finally {
        cookie.delete('session_token')

        redirect('/entrar')
    }
}
