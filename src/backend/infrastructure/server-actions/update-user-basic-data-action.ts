'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { UpdateUserBasicDataUseCase } from '@/backend/application/update-user-basic-data-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaUsersRepository } from '../repository/prisma/prisma-users-repository'
import { prisma } from '../repository/prisma'
import { logoutAction } from './logout-action'
import { redirect } from 'next/navigation'
import { updateUserBasicDataSchema } from './schemas'

export async function updateUserBasicDataAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        name: formData.get('name') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsed = updateUserBasicDataSchema.parse(rawData)

        const usersRepository = new PrismaUsersRepository(prisma)

        const useCase = new UpdateUserBasicDataUseCase(usersRepository)

        await useCase.execute({ userId, ...parsed })

        return { success: true }
    } catch (error: any) {
        if (error instanceof AuthenticationError) {
            await logoutAction()
            redirect(`/entrar?error=${error.type}`)
        }
        return { success: false, errorType: error.type }
    }
}
