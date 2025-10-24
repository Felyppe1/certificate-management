import { GetAllCertificateEmissionsUseCase } from '@/backend/application/get-all-certificate-emissions-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
