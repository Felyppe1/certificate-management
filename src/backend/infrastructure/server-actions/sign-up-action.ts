'use server'

import { SignUpUseCase } from '@/backend/application/sign-up-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { redirect } from 'next/navigation'

export async function signUpAction(formData: FormData): Promise<void> {
    // TODO: melhorar a action
    const email = formData.get('email') as string
    const name = formData.get('name') as string
    const password = formData.get('password') as string

    const usersRepository = new PrismaUsersRepository()

    const signUpUseCase = new SignUpUseCase(usersRepository)

    await signUpUseCase.execute({ name, email, password })

    redirect('/entrar')
}
