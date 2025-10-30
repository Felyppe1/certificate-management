import { GenerateCertificatesUseCase } from '@/backend/application/generate-certificates-use-case'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { handleError } from '@/utils/handle-error'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { NextRequest } from 'next/server'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
) {
    const { certificateEmissionId } = await params

    try {
        const sessionToken = await getSessionToken(request)

        const sessionsRepository = new PrismaSessionsRepository(prisma)

        const generateCertificatesUseCase = new GenerateCertificatesUseCase(
            sessionsRepository,
        )

        await generateCertificatesUseCase.execute({
            certificateEmissionId,
            sessionToken,
        })

        return Response.json(null, { status: 204 })
    } catch (error: any) {
        return await handleError(error)
    }
}
