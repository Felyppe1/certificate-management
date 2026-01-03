'use server'

import { DeleteGoogleAccountUseCase } from '@/backend/application/delete-google-account-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaUsersRepository } from '../repository/prisma/prisma-users-repository'
import { prisma } from '../repository/prisma'
import { PrismaExternalUserAccountsRepository } from '../repository/prisma/prisma-external-user-accounts-repository'
import { GoogleAuthGateway } from '../gateway/google-auth-gateway'
import { logoutAction } from './logout-action'
import { redirect } from 'next/navigation'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { cookies } from 'next/headers'

export async function deleteGoogleAccountAction() {
    try {
        const { userId } = await validateSessionToken()

        const usersRepository = new PrismaUsersRepository(prisma)
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()

        const deleteGoogleAccountUseCase = new DeleteGoogleAccountUseCase(
            usersRepository,
            externalUserAccountsRepository,
            googleAuthGateway,
        )

        await deleteGoogleAccountUseCase.execute({
            userId,
        })

        const cookie = await cookies()
        cookie.delete('session_token')
    } catch (error: any) {
        console.error('Error deleting Google account:', error)

        if (error instanceof AuthenticationError) {
            if (
                error.type === 'missing-session' ||
                error.type === 'session-not-found' ||
                error.type === 'user-not-found'
            ) {
                await logoutAction()
            }
        }
    }

    redirect('/entrar')
}
