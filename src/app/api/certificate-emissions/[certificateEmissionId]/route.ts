import { GetCertificateEmissionUseCase } from '@/backend/application/get-certificate-emission-use-case'
import { UpdateCertificateEmissionUseCase } from '@/backend/application/update-certificate-emission-use-case'
import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'
import { GENERATION_STATUS } from '@/backend/domain/data-set'
import { DATA_SOURCE_FILE_EXTENSION } from '@/backend/domain/data-source'
import { INPUT_METHOD } from '@/backend/domain/certificate'
import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSetsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-sets-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import {
    EMAIL_ERROR_TYPE_ENUM,
    PROCESSING_STATUS_ENUM,
} from '@/backend/domain/email'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { updateCertificateEmissionSchema } from '@/backend/infrastructure/server-actions/schemas'

export interface GetCertificateEmissionControllerResponse {
    certificateEmission: {
        id: string
        name: string
        userId: string
        status: CERTIFICATE_STATUS
        createdAt: Date
        variableColumnMapping: Record<string, string | null> | null
        template: {
            driveFileId: string | null
            storageFileUrl: string | null
            inputMethod: INPUT_METHOD
            fileName: string
            fileExtension: TEMPLATE_FILE_EXTENSION
            variables: string[]
            thumbnailUrl: string | null
        } | null
        dataSource: {
            driveFileId: string | null
            storageFileUrl: string | null
            inputMethod: INPUT_METHOD
            fileName: string
            fileExtension: DATA_SOURCE_FILE_EXTENSION
            columns: string[]
            thumbnailUrl: string | null
            dataSet: {
                id: string
                generationStatus: GENERATION_STATUS | null
                totalBytes: number
                rows: Record<string, any>[]
            }
        } | null
        email: {
            subject: string
            body: string
            scheduledAt: Date | null
            emailColumn: string
            emailErrorType: EMAIL_ERROR_TYPE_ENUM | null
            status: PROCESSING_STATUS_ENUM
        } | null
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<
    NextResponse<GetCertificateEmissionControllerResponse | HandleErrorResponse>
> {
    const { certificateEmissionId } = await params

    try {
        const { userId } = await validateSessionToken()

        const getCertificateUseCase = new GetCertificateEmissionUseCase()

        const certificateEmission = await getCertificateUseCase.execute({
            certificateId: certificateEmissionId,
            userId,
        })

        return NextResponse.json({ certificateEmission })
    } catch (error: unknown) {
        return await handleError(error)
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<NextResponse<null | HandleErrorResponse>> {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const { token } = await validateSessionToken(request)

        const body = await request.json()
        const parsed = updateCertificateEmissionSchema.parse(body)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const transactionManager = new PrismaTransactionManager(prisma)

        const updateCertificateEmissionUseCase =
            new UpdateCertificateEmissionUseCase(
                certificatesRepository,
                sessionsRepository,
                dataSetsRepository,
                transactionManager,
            )

        await updateCertificateEmissionUseCase.execute({
            id: certificateEmissionId,
            name: parsed.name,
            variableColumnMapping: parsed.variableColumnMapping,
            sessionToken: token,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
