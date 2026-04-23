'use server'

import { VerifyEmailUseCase } from '@/backend/application/verify-email-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { setSessionCookie } from '@/app/api/_utils/set-session-cookie'

export async function verifyEmailAction(_: unknown, formData: FormData) {
    const email = formData.get('email') as string
    const code = formData.get('code') as string

    try {
        const useCase = new VerifyEmailUseCase(
            new PrismaUsersRepository(prisma),
            new PrismaSessionsRepository(prisma),
            new PrismaTransactionManager(prisma),
        )

        const result = await useCase.execute({ email, code })

        await setSessionCookie(result.sessionToken)

        return { success: true }
    } catch (error: any) {
        return { success: false, errorType: error.type as string }
    }
}
