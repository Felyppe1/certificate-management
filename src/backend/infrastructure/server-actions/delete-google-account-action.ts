'use server'

import { DeleteGoogleAccountUseCase } from '@/backend/application/delete-google-account-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { cookies } from 'next/headers'
import { PrismaSessionsRepository } from '../repository/prisma/prisma-sessions-repository'
import { PrismaUsersRepository } from '../repository/prisma/prisma-users-repository'
import { prisma } from '../repository/prisma'
import { PrismaExternalUserAccountsRepository } from '../repository/prisma/prisma-external-user-accounts-repository'
import { GoogleAuthGateway } from '../gateway/google-auth-gateway'
import { logoutAction } from './logout-action'
import { redirect } from 'next/navigation'

export async function deleteGoogleAccountAction() {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    try {
        if (!sessionToken) {
            throw new AuthenticationError('missing-session')
        }

        // const parsedData = deleteDataSourceSchema.parse(rawData)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const usersRepository = new PrismaUsersRepository(prisma)
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()

        const deleteGoogleAccountUseCase = new DeleteGoogleAccountUseCase(
            usersRepository,
            externalUserAccountsRepository,
            sessionsRepository,
            googleAuthGateway,
        )

        await deleteGoogleAccountUseCase.execute({
            sessionToken,
        })

        cookie.delete('session_token')
    } catch (error) {
        console.error('Error deleting Google account:', error)

        if (error instanceof AuthenticationError) {
            await logoutAction()
        }
    }

    redirect('/entrar')
}
