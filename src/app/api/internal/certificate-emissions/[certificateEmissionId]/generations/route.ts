import { GENERATION_STATUS } from '@/backend/domain/data-set'
import { PrismaDataSetsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-sets-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import z from 'zod'
import { sseBroker } from '@/backend/infrastructure/sse'
import { validateServiceAccountToken } from '@/utils/middleware/validateServiceAccountToken'
import { FinishCertificatesGenerationSetUseCase } from '@/backend/application/finish-certificates-generation-use-case'

const updateDataSetSchema = z.object({
    generationStatus: z.enum([
        GENERATION_STATUS.COMPLETED,
        GENERATION_STATUS.FAILED,
    ]),
    totalBytes: z.number().optional(),
})

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<NextResponse<null | HandleErrorResponse>> {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        await validateServiceAccountToken(request)

        const body = await request.json()
        const parsed = updateDataSetSchema.parse(body)

        const dataSetsRepository = new PrismaDataSetsRepository(prisma)

        const finishCertificatesGenerationSetUseCase =
            new FinishCertificatesGenerationSetUseCase(dataSetsRepository)

        await finishCertificatesGenerationSetUseCase.execute({
            certificateEmissionId,
            generationStatus: parsed.generationStatus,
            totalBytes: parsed.totalBytes,
        })

        sseBroker.sendEvent(certificateEmissionId, {
            generationStatus: parsed.generationStatus,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
