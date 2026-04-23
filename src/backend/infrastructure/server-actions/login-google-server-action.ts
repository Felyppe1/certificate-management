'use server'

import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { LoginGoogleUseCase } from '@/backend/application/login-google-use-case'
import { setSessionCookie } from '@/app/api/_utils/set-session-cookie'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { loginGoogleServerActionSchema } from './schemas'

export async function loginGoogleServerAction(_: unknown, formData: FormData) {
    const code = formData.get('code') as string

    try {
        const parsedCode = loginGoogleServerActionSchema.parse(code)

        const { userId } = await validateSessionToken()

        const usersRepository = new PrismaUsersRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const transactionManager = new PrismaTransactionManager(prisma)

        const loginGoogleUseCase = new LoginGoogleUseCase(
            usersRepository,
            sessionsRepository,
            googleAuthGateway,
            transactionManager,
        )

        const { sessionToken } = await loginGoogleUseCase.execute({
            code: parsedCode,
            reAuthenticate: true,
            userId,
        })

        await setSessionCookie(sessionToken)

        return {
            success: true,
        }

        // return NextResponse.redirect(env.NEXT_PUBLIC_BASE_URL + '/')
    } catch (error: any) {
        console.error(error)
        if (error instanceof AuthenticationError) {
            if (
                error.type === 'missing-session' ||
                error.type === 'session-not-found'
            ) {
                await logoutAction()
            }
        }

        return {
            success: false,
            errorType: error.type,
        }
    }
}
