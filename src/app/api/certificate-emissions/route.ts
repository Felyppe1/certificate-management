import { GetAllCertificateEmissionsUseCase } from '@/backend/application/get-all-certificate-emissions-use-case'
import { CreateCertificateEmissionUseCase } from '@/backend/application/create-certificate-emission-use-case'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { handleError } from '@/utils/handle-error'
import z from 'zod'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'

export async function GET(request: NextRequest) {
    try {
        const { token } = await validateSessionToken(request)

        const sessionsRepository = new PrismaSessionsRepository(prisma)

        const getAllCertificatesUseCase = new GetAllCertificateEmissionsUseCase(
            sessionsRepository,
        )

        const certificateEmissions = await getAllCertificatesUseCase.execute({
            sessionToken: token,
            // userId,
        })

        return NextResponse.json({ certificateEmissions })
    } catch (error: any) {
        return await handleError(error)
    }
}

const createCertificateEmissionSchema = z.object({
    name: z
        .string()
        .min(1, 'Emission name must have at least 3 characters')
        .max(100, 'Emission name must have at most 100 characters'),
})

export async function POST(request: NextRequest) {
    try {
        const { token } = await validateSessionToken(request)

        const body = await request.json()
        const parsed = createCertificateEmissionSchema.parse(body)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)

        const createCertificateEmissionUseCase =
            new CreateCertificateEmissionUseCase(
                certificatesRepository,
                sessionsRepository,
            )

        const certificateEmissionId =
            await createCertificateEmissionUseCase.execute({
                name: parsed.name,
                sessionToken: token,
            })

        return Response.json({ id: certificateEmissionId }, { status: 201 })
    } catch (error: any) {
        return await handleError(error)
    }
}
