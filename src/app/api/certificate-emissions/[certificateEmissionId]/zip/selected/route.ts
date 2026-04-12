import { DownloadCertificateEmissionsUseCase } from '@/backend/application/download-certificate-emissions-use-case'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-source-rows-repository'

import { handleError, HandleErrorResponse } from '@/app/api/_utils/handle-error'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import { downloadCertificateEmissionsSchema } from '@/backend/infrastructure/server-actions/schemas'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<Response | NextResponse<HandleErrorResponse>> {
    const { certificateEmissionId } = await params

    try {
        const { userId } = await validateSessionToken()

        const body = await request.json()
        const parsed = downloadCertificateEmissionsSchema.parse(body)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const bucket = new GcpBucket()

        const downloadCertificateEmissionsUseCase =
            new DownloadCertificateEmissionsUseCase(
                bucket,
                certificatesRepository,
                dataSourceRowsRepository,
            )

        const zipStream = await downloadCertificateEmissionsUseCase.execute({
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
