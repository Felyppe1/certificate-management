'use server'

import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { UpdateSystemPasswordUseCase } from '@/backend/application/update-system-password-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaUsersRepository } from '../../interface-adapters/repository/prisma/write/prisma-users-repository'
import { prisma } from '../repository/prisma'
import { logoutAction } from './logout-action'
import { redirect } from 'next/navigation'
import { updateSystemPasswordSchema } from './schemas'

export async function updateSystemPasswordAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        currentPassword: formData.get('currentPassword') as string,
        newPassword: formData.get('newPassword') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsed = updateSystemPasswordSchema.parse(rawData)

        const useCase = new UpdateSystemPasswordUseCase(
            new PrismaUsersRepository(prisma),
        )

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
