'use server'

import { NextRequest, NextResponse } from 'next/server'
import { DeleteDataSourceUseCase } from '@/backend/application/delete-data-source-use-case'
import { RefreshDataSourceUseCase } from '@/backend/application/refresh-data-source-use-case'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-source-rows-repository'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { SpreadsheetContentExtractorFactory } from '@/backend/infrastructure/factory/spreadsheet-content-extractor-factory'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { ColumnType } from '@/backend/domain/data-source'
import { updateDataSourceColumnsSchema } from '@/backend/infrastructure/server-actions/schemas'
import { UpdateDataSourceColumnsUseCase } from '@/backend/application/update-data-source-columns-use-case'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<NextResponse<null | HandleErrorResponse>> {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const { userId } = await validateSessionToken(request)

        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const bucket = new GcpBucket()

        const deleteDataSourceUseCase = new DeleteDataSourceUseCase(
            certificateEmissionsRepository,
            bucket,
        )

        await deleteDataSourceUseCase.execute({
            certificateId: certificateEmissionId,
            userId,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<NextResponse<null | HandleErrorResponse>> {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const { userId } = await validateSessionToken(request)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)
        const transactionManager = new PrismaTransactionManager(prisma)

        const refreshDataSourceUseCase = new RefreshDataSourceUseCase(
            certificatesRepository,
            dataSourceRowsRepository,
            googleDriveGateway,
            googleAuthGateway,
            spreadsheetContentExtractorFactory,
            externalUserAccountsRepository,
            transactionManager,
        )

        await refreshDataSourceUseCase.execute({
            userId,
            certificateId: certificateEmissionId,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}

interface UpdateDataSourceColumnsBody {
    columns: {
        name: string
        type: ColumnType
        arraySeparator: string | null
    }[]
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<NextResponse<any | HandleErrorResponse>> {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const { userId } = await validateSessionToken(request)

        const body = await request.json()

        const parsedData = updateDataSourceColumnsSchema.parse({
            certificateId: certificateEmissionId,
            columns: body.columns,
        })

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )

        const useCase = new UpdateDataSourceColumnsUseCase(
            certificatesRepository,
            dataSourceRowsRepository,
        )

        const columns = parsedData.columns.map(col => ({
            name: col.name,
            type: col.type,
            arrayMetadata:
                col.type === 'array' && col.arraySeparator
                    ? { separator: col.arraySeparator }
                    : null,
        }))

        const result = await useCase.execute({
            userId,
            certificateId: parsedData.certificateId,
            columns,
        })

        if (result.invalidColumns.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    invalidColumns: result.invalidColumns,
                },
                { status: 422 },
            )
        }

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
