import { DownloadSelectedCertificatesUseCase } from '@/backend/application/download-selected-certificates-use-case'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-source-rows-repository'

import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import { downloadSelectedCertificatesSchema } from '@/backend/infrastructure/server-actions/schemas'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<Response | NextResponse<HandleErrorResponse>> {
    const { certificateEmissionId } = await params

    try {
        const { userId } = await validateSessionToken()

        const body = await request.json()
        const parsed = downloadSelectedCertificatesSchema.parse(body)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const bucket = new GcpBucket()

        const downloadSelectedCertificatesUseCase =
            new DownloadSelectedCertificatesUseCase(
                bucket,
                certificatesRepository,
                dataSourceRowsRepository,
            )

        const zipStream = await downloadSelectedCertificatesUseCase.execute({
            certificateEmissionId,
            userId,
            rowIds: parsed.rowIds,
        })

        const webStream = Readable.toWeb(zipStream as Readable)

        return new Response(webStream as any, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="certificates-selected-${certificateEmissionId}.zip"`,
            },
        })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
