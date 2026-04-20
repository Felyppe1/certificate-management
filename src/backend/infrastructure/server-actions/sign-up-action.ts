'use server'

import { SignUpUseCase } from '@/backend/application/sign-up-use-case'
import { ResendNotificationGateway } from '@/backend/infrastructure/gateway/resend-notification-gateway'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { signUpSchema } from './schemas'

export async function signUpAction(_: unknown, formData: FormData) {
    const rawData = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    try {
        const parsedData = signUpSchema.parse(rawData)

        const usersRepository = new PrismaUsersRepository(prisma)
        const notificationGateway = new ResendNotificationGateway()

        const signUpUseCase = new SignUpUseCase(
            usersRepository,
            notificationGateway,
        )

        await signUpUseCase.execute({
            name: parsedData.name,
            email: parsedData.email,
            password: parsedData.password,
        })
        return { success: true as const }
    } catch (error: any) {
        console.log(error)

        return {
            success: false as const,
            errorType: error.type,
        }
    }
}
