import { GetAllCertificateEmissionsUseCase } from '@/backend/application/get-all-certificate-emissions-use-case'
import { CreateCertificateEmissionUseCase } from '@/backend/application/create-certificate-emission-use-case'
import { PrismaSessionsRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-sessions-repository'
import { PrismaCertificatesRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaCertificateEmissionsRepositoryRead } from '@/backend/interface-adapters/repository/prisma/read/prisma-certificate-emissions-repository-read'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { handleError, HandleErrorResponse } from '@/app/api/_utils/handle-error'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { createCertificateEmissionSchema } from '@/backend/infrastructure/server-actions/schemas'
import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'
import {
    parseCertificateEmissionsSort,
    parseCertificateEmissionsStatuses,
} from './parse-query'

export interface GetCertificateEmissionsResponse {
    certificateEmissions: {
        id: string
        name: string
        userId: string
        status: CERTIFICATE_STATUS
        createdAt: Date
    }[]
}

export interface GetCertificateEmissionsParams {
    search?: string
    sort?: string
    status?: string
}

export async function GET(
    request: NextRequest,
): Promise<
    NextResponse<GetCertificateEmissionsResponse | HandleErrorResponse>
> {
    try {
        const { userId } = await validateSessionToken(request)

        const search = request.nextUrl.searchParams.get('search') ?? undefined
        const sort = parseCertificateEmissionsSort(
            request.nextUrl.searchParams.get('sort'),
        )
        const statuses = parseCertificateEmissionsStatuses(
            request.nextUrl.searchParams.get('status'),
        )

        const getAllCertificatesUseCase = new GetAllCertificateEmissionsUseCase(
            new PrismaCertificateEmissionsRepositoryRead(prisma),
        )

        const certificateEmissions = await getAllCertificatesUseCase.execute({
            userId,
            search,
            sort,
            statuses,
        })

        return NextResponse.json({ certificateEmissions })
    } catch (error: unknown) {
        return await handleError(error)
    }
}

export interface CreateCertificateEmissionControllerResponse {
    id: string
}

export async function POST(
    request: NextRequest,
): Promise<
    NextResponse<
        CreateCertificateEmissionControllerResponse | HandleErrorResponse
    >
> {
    try {
        const { userId } = await validateSessionToken(request)

        const body = await request.json()
        const parsed = createCertificateEmissionSchema.parse(body)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)

        const createCertificateEmissionUseCase =
            new CreateCertificateEmissionUseCase(certificatesRepository)

        const certificateEmissionId =
            await createCertificateEmissionUseCase.execute({
                name: parsed.name,
                userId,
            })

        return NextResponse.json({ id: certificateEmissionId }, { status: 201 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
