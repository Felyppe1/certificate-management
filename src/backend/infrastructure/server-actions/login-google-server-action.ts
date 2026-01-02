'use server'

import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { cookies } from 'next/headers'
import { LoginGoogleUseCase } from '@/backend/application/login-google-use-case'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import z from 'zod'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'

const loginGoogleServerActionSchema = z.string().min(1, 'Código é obrigatório')

export async function loginGoogleServerAction(_: unknown, formData: FormData) {
    const code = formData.get('code') as string

    try {
        const parsedCode = loginGoogleServerActionSchema.parse(code)

        const usersRepository = new PrismaUsersRepository(prisma)
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const transactionManager = new PrismaTransactionManager(prisma)

        const loginGoogleUseCase = new LoginGoogleUseCase(
            usersRepository,
            externalUserAccountsRepository,
            sessionsRepository,
            googleAuthGateway,
            transactionManager,
        )

        const sessionToken = await loginGoogleUseCase.execute({
            code: parsedCode,
            reAuthenticate: true,
        })

        const cookie = await cookies()

        cookie.set('session_token', sessionToken, {
            httpOnly: true,
            path: '/',
            // secure: true,
            // sameSite: "strict" // TODO: use sameSite
        })

        // return NextResponse.redirect(process.env.NEXT_PUBLIC_BASE_URL + '/')
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
