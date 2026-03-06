import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import { NextRequest, NextResponse } from 'next/server'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { validateServiceAccountToken } from '@/utils/middleware/validateServiceAccountToken'

export async function POST(
    request: NextRequest,
): Promise<NextResponse<null | HandleErrorResponse>> {
    try {
        await validateServiceAccountToken(request)

        const usersRepository = new PrismaUsersRepository(prisma)
        await usersRepository.resetAllDailyCredits()

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
