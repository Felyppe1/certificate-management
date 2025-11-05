import { UpdateDataSetUseCase } from '@/backend/application/update-data-set-use-case'
import { GENERATION_STATUS } from '@/backend/domain/data-set'
import { PrismaDataSetsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-sets-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest } from 'next/server'
import { handleError } from '@/utils/handle-error'
import z from 'zod'
import { verifyServiceAccountToken } from '@/utils/middleware/verifyServiceAccountToken'
import { sseBroker } from '@/app/api/data-sets/[dataSetId]/events/route'

const updateDataSetSchema = z.object({
    generationStatus: z.enum(GENERATION_STATUS).optional(),
    totalBytes: z.number().optional(),
})

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ dataSetId: string }> },
) {
    const dataSetId = (await params).dataSetId

    try {
        await verifyServiceAccountToken(request)

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
            totalBytes: parsed.totalBytes,
            sessionToken: null,
        })

        sseBroker.sendEvent(dataSetId, {
            generationStatus: parsed.generationStatus,
        })

        return new Response(null, { status: 204 })
    } catch (error: any) {
        return await handleError(error)
    }
}
