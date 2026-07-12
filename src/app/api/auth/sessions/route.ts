import { LoginUseCase } from '@/backend/application/login-use-case'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { PrismaSessionsRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { handleError, HandleErrorResponse } from '@/app/api/_utils/handle-error'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { setSessionCookie } from '@/app/api/_utils/set-session-cookie'

export interface GetSessionControllerResponse {
    token: string
    userId: string
}

export async function GET(
    request: NextRequest,
): Promise<NextResponse<GetSessionControllerResponse | HandleErrorResponse>> {
    try {
        const session = await validateSessionToken(request)

        return NextResponse.json(session)
    } catch (error: unknown) {
        return await handleError(error)
    }
}

export interface LoginSessionControllerResponse {
    id: string
    email: string | null
    name: string
}

export async function POST(
    request: Request,
): Promise<NextResponse<LoginSessionControllerResponse | HandleErrorResponse>> {
    try {
        const { email, password } = await request.json()

        const usersRepository = new PrismaUsersRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)

        const loginUseCase = new LoginUseCase(
            usersRepository,
            sessionsRepository,
        )

        const result = await loginUseCase.execute(email, password)

        await setSessionCookie(result.token)

        return NextResponse.json(result.user)
    } catch (error: unknown) {
        return await handleError(error)
    }
}
