import { DownloadCertificatesUseCase } from '@/backend/application/download-certificates-use-case'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSetsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-sets-repository'

import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<Response | NextResponse<HandleErrorResponse>> {
    const { certificateEmissionId } = await params

    try {
        const { userId } = await validateSessionToken()

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const bucket = new GcpBucket()

        const downloadCertificatesUseCase = new DownloadCertificatesUseCase(
            bucket,
            certificatesRepository,
            dataSetsRepository,
        )

        const zipStream = await downloadCertificatesUseCase.execute({
            certificateEmissionId,
            userId,
        })

        return new Response(zipStream as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename=certificates-${certificateEmissionId}.zip`,
            },
        })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
