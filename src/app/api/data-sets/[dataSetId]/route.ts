import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest } from 'next/server'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { handleError } from '@/utils/handle-error'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GetDataSetUseCase } from '@/backend/application/get-data-set-use-case'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ dataSetId: string }> },
) {
    const dataSetId = (await params).dataSetId

    try {
        const sessionToken = await getSessionToken(request)

        if (!sessionToken) {
            throw new AuthenticationError('missing-session')
        }

        const sessionsRepository = new PrismaSessionsRepository(prisma)

        const getDataSetUseCase = new GetDataSetUseCase(sessionsRepository)

        const dataSet = await getDataSetUseCase.execute({
            dataSetId,
            sessionToken,
        })

        return Response.json({ dataSet })
    } catch (error: any) {
        return await handleError(error)
    }
}
