import { GetCertificateEmissionUseCase } from '@/backend/application/get-certificate-emission-use-case'
import { UpdateCertificateEmissionUseCase } from '@/backend/application/update-certificate-emission-use-case'
import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'
import {
    ColumnType,
    DATA_SOURCE_FILE_EXTENSION,
} from '@/backend/domain/data-source'
import { INPUT_METHOD } from '@/backend/domain/certificate'
import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'

import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-source-rows-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import {
    EMAIL_ERROR_TYPE_ENUM,
    PROCESSING_STATUS_ENUM as EMAIL_PROCESSING_STATUS_ENUM,
} from '@/backend/domain/email'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { updateCertificateEmissionSchema } from '@/backend/infrastructure/server-actions/schemas'
import {
    PROCESSING_STATUS_ENUM as DATA_SOURCE_ROW_PROCESSING_STATUS_ENUM,
    RowType,
} from '@/backend/domain/data-source-row'

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
            columns: {
                name: string
                type: ColumnType
                arraySeparator: string | null
            }[]
            thumbnailUrl: string | null
            rows: {
                id: string
                processingStatus: DATA_SOURCE_ROW_PROCESSING_STATUS_ENUM
                fileBytes: number | null
                data: Record<string, RowType>
            }[]
        } | null
        email: {
            subject: string
            body: string
            scheduledAt: Date | null
            emailColumn: string
            emailErrorType: EMAIL_ERROR_TYPE_ENUM | null
            status: EMAIL_PROCESSING_STATUS_ENUM
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
        const { userId } = await validateSessionToken(request)

        const body = await request.json()
        const parsed = updateCertificateEmissionSchema.parse(body)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const transactionManager = new PrismaTransactionManager(prisma)

        const updateCertificateEmissionUseCase =
            new UpdateCertificateEmissionUseCase(
                certificatesRepository,
                dataSourceRowsRepository,
                transactionManager,
            )

        await updateCertificateEmissionUseCase.execute({
            id: certificateEmissionId,
            name: parsed.name,
            variableColumnMapping: parsed.variableColumnMapping,
            userId,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
