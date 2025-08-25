import { SignUpUseCase } from '@/backend/application/sign-up-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { NextResponse } from 'next/server'

interface SignUpRequestBody {
    name: string
    email: string
    password: string
}

interface SignUpResponse {
    userId: string
}

export async function POST(
    request: Request,
): Promise<NextResponse<SignUpResponse>> {
    const body = (await request.json()) as SignUpRequestBody

    const usersRepository = new PrismaUsersRepository()

    const signUpUseCase = new SignUpUseCase(usersRepository)

    const result = await signUpUseCase.execute(body)

    return NextResponse.json(result, { status: 201 })
}
