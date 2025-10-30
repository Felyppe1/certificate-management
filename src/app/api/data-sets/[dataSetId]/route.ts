import { UpdateDataSetUseCase } from '@/backend/application/update-data-set-use-case'
import { GENERATION_STATUS } from '@/backend/domain/data-set'
import { PrismaDataSetsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-sets-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest } from 'next/server'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { handleError } from '@/utils/handle-error'
import z from 'zod'

const updateDataSetSchema = z.object({
    generationStatus: z.enum(GENERATION_STATUS),
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ dataSetId: string }> },
) {
    const dataSetId = (await params).dataSetId

    try {
        const sessionToken = await getSessionToken(request)

        const body = await request.json()
        const parsed = updateDataSetSchema.parse(body)

        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)

        const updateDataSetUseCase = new UpdateDataSetUseCase(
            dataSetsRepository,
            sessionsRepository,
        )

        await updateDataSetUseCase.execute({
            dataSetId,
            generationStatus: parsed.generationStatus,
            sessionToken,
        })

        return new Response(null, { status: 204 })
    } catch (error: any) {
        return await handleError(error)
    }
}
