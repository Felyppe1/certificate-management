'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { GetMeUseCase } from '@/backend/application/get-me-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { redirect } from 'next/navigation'
import { GetMeResponse } from '@/app/api/users/me/route'

export async function getMeAction(): Promise<GetMeResponse> {
    try {
        const { userId } = await validateSessionToken()

        const usersRepository = new PrismaUsersRepository(prisma)
        const getMeUseCase = new GetMeUseCase(usersRepository)
        const user = await getMeUseCase.execute({ userId })

        return { user }
    } catch (error) {
        if (error instanceof AuthenticationError) {
            redirect('/api/auth/sessions/logout')
        }
        throw error
    }
}
