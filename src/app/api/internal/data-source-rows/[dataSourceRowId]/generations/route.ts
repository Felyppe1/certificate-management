import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import z from 'zod'
import { sseBroker } from '@/backend/infrastructure/sse'
import { validateServiceAccountToken } from '@/utils/middleware/validateServiceAccountToken'
import { FinishCertificatesGenerationUseCase } from '@/backend/application/finish-certificates-generation-use-case'
import { PrismaDataSourceRowsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'

const finishCertificatesGenerationSchema = z.object({
    success: z.boolean(),
    totalBytes: z.number().optional(),
})

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ dataSourceRowId: string }> },
): Promise<NextResponse<null | HandleErrorResponse>> {
    const dataSourceRowId = (await params).dataSourceRowId

    try {
        await validateServiceAccountToken(request)

        const body = await request.json()
        const parsed = finishCertificatesGenerationSchema.parse(body)

        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const transactionManager = new PrismaTransactionManager(prisma)

        const finishCertificatesGenerationUseCase =
            new FinishCertificatesGenerationUseCase(
                dataSourceRowsRepository,
                certificateEmissionsRepository,
                transactionManager,
            )

        const { certificateEmissionId } =
            await finishCertificatesGenerationUseCase.execute({
                dataSourceRowId,
                success: parsed.success,
                totalBytes: parsed.totalBytes,
            })

        sseBroker.sendEvent(certificateEmissionId, {
            type: 'row-completed',
            dataSourceRowId,
            success: parsed.success,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
