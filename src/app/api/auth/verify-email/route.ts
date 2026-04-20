import { NextRequest, NextResponse } from 'next/server'
import { VerifyEmailUseCase } from '@/backend/application/verify-email-use-case'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
        return NextResponse.redirect(
            new URL('/entrar?error=verification-token-not-found', request.url),
        )
    }

    try {
        const useCase = new VerifyEmailUseCase(
            new PrismaUsersRepository(prisma),
        )

        await useCase.execute({ token })

        return NextResponse.redirect(new URL('/', request.url))
    } catch (error: any) {
        const errorType: string = error?.type ?? 'unknown-error'
        return NextResponse.redirect(
            new URL(`/entrar?error=${errorType}`, request.url),
        )
    }
}
