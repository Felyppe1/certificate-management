import { DownloadCertificatesUseCase } from '@/backend/application/download-certificates-use-case'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSetsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-sets-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { handleError } from '@/utils/handle-error'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { NextRequest } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
) {
    const { certificateEmissionId } = await params

    try {
        const sessionToken = await getSessionToken()

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const bucket = new GcpBucket()

        const downloadCertificatesUseCase = new DownloadCertificatesUseCase(
            bucket,
            certificatesRepository,
            sessionsRepository,
            dataSetsRepository,
        )

        const zipStream = await downloadCertificatesUseCase.execute({
            certificateEmissionId,
            sessionToken,
        })

        return new Response(zipStream as any, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename=certificates-${certificateEmissionId}.zip`,
            },
        })
    } catch (error: any) {
        return await handleError(error)
    }
}
