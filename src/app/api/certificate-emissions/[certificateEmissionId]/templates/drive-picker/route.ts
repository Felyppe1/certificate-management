'use server'

import { NextRequest, NextResponse } from 'next/server'
import { AddTemplateByDrivePickerUseCase } from '@/backend/application/add-template-by-drive-picker-use-case'
import { FileContentExtractorFactory } from '@/backend/interface-adapters/factory/file-content-extractor-factory'
import { GoogleAuthGateway } from '@/backend/interface-adapters/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/interface-adapters/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { GcpBucket } from '@/backend/interface-adapters/cloud/gcp/gcp-bucket'
import z from 'zod'
import { handleError, HandleErrorResponse } from '@/app/api/_utils/handle-error'
import { PrismaDataSourceRowsRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '@/backend/interface-adapters/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { LiquidStringVariableExtractor } from '@/backend/interface-adapters/string-variable-extractor/liquidjs'
import { gcpStorage } from '@/backend/infrastructure/cloud/gcp'

const addTemplateByDrivePickerBodySchema = z.object({
    fileId: z.string().min(1, 'File ID is required'),
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
): Promise<NextResponse<null | HandleErrorResponse>> {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const { userId } = await validateSessionToken(request)

        const body = await request.json()
        const parsed = addTemplateByDrivePickerBodySchema.parse(body)

        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const usersRepository = new PrismaUsersRepository(prisma)
        const bucket = new GcpBucket(gcpStorage)
        const transactionManager = new PrismaTransactionManager(prisma)
        const stringVariableExtractor = new LiquidStringVariableExtractor()

        const addTemplateByDrivePickerUseCase =
            new AddTemplateByDrivePickerUseCase(
                certificateEmissionsRepository,
                googleDriveGateway,
                fileContentExtractorFactory,
                usersRepository,
                dataSourceRowsRepository,
                googleAuthGateway,
                bucket,
                transactionManager,
                stringVariableExtractor,
            )

        await addTemplateByDrivePickerUseCase.execute({
            certificateId: certificateEmissionId,
            fileId: parsed.fileId,
            userId,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
