'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { updateTag } from 'next/cache'
import { AddDataSourceByUploadUseCase } from '@/backend/application/add-data-source-by-upload-use-case'
import { SpreadsheetContentExtractorFactory } from '../factory/spreadsheet-content-extractor-factory'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { logoutAction } from './logout-action'
import { addDataSourceByUploadSchema } from './schemas/certificate-emission-schemas'

export async function addDataSourceByUploadAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
        file: formData.get('file') as File,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = addDataSourceByUploadSchema.parse(rawData)

        const bucket = new GcpBucket()
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()
        const transactionManager = new PrismaTransactionManager(prisma)

        const addDataSourceByUploadUseCase = new AddDataSourceByUploadUseCase(
            bucket,
            certificatesRepository,
            dataSetsRepository,
            spreadsheetContentExtractorFactory,
            transactionManager,
        )

        await addDataSourceByUploadUseCase.execute({
            userId,
            certificateId: parsedData.certificateId,
            file: parsedData.file,
        })
    } catch (error: any) {
        console.error(error)

        if (error instanceof AuthenticationError) {
            if (
                error.type === 'missing-session' ||
                error.type === 'session-not-found' ||
                error.type === 'user-not-found'
            ) {
                await logoutAction()
            }
        }

        return {
            success: false,
            errorType: error.type,
        }
    }

    updateTag('certificate')

    return {
        success: true,
    }
}
