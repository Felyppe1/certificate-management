import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { GetDataSetUseCase } from '@/backend/application/get-data-set-use-case'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'

export interface GetDataSetControllerResponse {
    dataSet: {
        id: string
        rows: Record<string, unknown>[]
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ dataSetId: string }> },
): Promise<NextResponse<GetDataSetControllerResponse | HandleErrorResponse>> {
    const dataSetId = (await params).dataSetId

    try {
        const { token } = await validateSessionToken(request)

        const sessionsRepository = new PrismaSessionsRepository(prisma)

        const getDataSetUseCase = new GetDataSetUseCase(sessionsRepository)

        const dataSet = await getDataSetUseCase.execute({
            dataSetId,
            sessionToken: token,
        })

        return NextResponse.json({ dataSet })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
