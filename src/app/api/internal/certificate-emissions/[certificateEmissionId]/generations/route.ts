import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import z from 'zod'
import { sseBroker } from '@/backend/infrastructure/sse'
import { validateServiceAccountToken } from '@/utils/middleware/validateServiceAccountToken'
import { FinishCertificatesGenerationUseCase } from '@/backend/application/finish-certificates-generation-use-case'
import { PrismaDataSourceRowsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-source-rows-repository'
import { PROCESSING_STATUS_ENUM } from '@/backend/domain/data-source-row'

const updateDataSetSchema = z.object({
    success: z.boolean(),
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

        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )

        const finishCertificatesGenerationUseCase =
            new FinishCertificatesGenerationUseCase(dataSourceRowsRepository)

        await finishCertificatesGenerationUseCase.execute({
            certificateEmissionId,
            success: parsed.success,
            totalBytes: parsed.totalBytes,
        })

        sseBroker.sendEvent(certificateEmissionId, {
            processingStatus: parsed.success
                ? PROCESSING_STATUS_ENUM.COMPLETED
                : PROCESSING_STATUS_ENUM.FAILED,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
