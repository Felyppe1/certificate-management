import { GetAllCertificateEmissionsUseCase } from '@/backend/application/get-all-certificate-emissions-use-case'
import { CreateCertificateEmissionUseCase } from '@/backend/application/create-certificate-emission-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { handleError } from '@/utils/handle-error'
import z from 'zod'

export async function GET(/*request: Request, { params }: { params: Promise<{ id: string}>}*/) {
    await new Promise(resolve => setTimeout(resolve, 3000))

    const cookie = await cookies()
    // const { id: userId } = await params

    try {
        const sessionToken = cookie.get('session_token')!.value

        const sessionsRepository = new PrismaSessionsRepository()

        const getAllCertificatesUseCase = new GetAllCertificateEmissionsUseCase(
            sessionsRepository,
        )

        const certificateEmissions = await getAllCertificatesUseCase.execute({
            sessionToken,
            // userId,
        })

        return NextResponse.json({ certificateEmissions })
    } catch (error: any) {
        if (error instanceof AuthenticationError) {
            return NextResponse.json(
                { type: error.type, title: error.title },
                { status: 401 },
            )
        }

        return NextResponse.json(
            {
                type: 'internal-server-error',
                title: 'An unexpected error occurred while getting the certificate emissions',
            },
            { status: 500 },
        )
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
        const sessionToken = await getSessionToken(request)

        const body = await request.json()
        const parsed = createCertificateEmissionSchema.parse(body)

        const certificatesRepository = new PrismaCertificatesRepository()
        const sessionsRepository = new PrismaSessionsRepository()

        const createCertificateEmissionUseCase =
            new CreateCertificateEmissionUseCase(
                certificatesRepository,
                sessionsRepository,
            )

        const certificateEmissionId =
            await createCertificateEmissionUseCase.execute({
                name: parsed.name,
                sessionToken,
            })

        return Response.json({ id: certificateEmissionId }, { status: 201 })
    } catch (error: any) {
        await handleError(error)
    }
}
