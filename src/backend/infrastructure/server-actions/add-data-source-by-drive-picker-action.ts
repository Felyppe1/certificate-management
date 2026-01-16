'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { updateTag } from 'next/cache'
import z from 'zod'
import { logoutAction } from './logout-action'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { AddDataSourceByDrivePickerUseCase } from '@/backend/application/add-data-source-by-drive-picker-use-case'
import { SpreadsheetContentExtractorFactory } from '../factory/spreadsheet-content-extractor-factory'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { addDataSourceByDrivePickerSchema } from './schemas'

export async function addDataSourceByDrivePickerAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
        fileId: formData.get('fileId') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = addDataSourceByDrivePickerSchema.parse(rawData)

        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)
        const bucket = new GcpBucket()
        const transactionManager = new PrismaTransactionManager(prisma)

        const addDataSourceByDrivePickerUseCase =
            new AddDataSourceByDrivePickerUseCase(
                certificateEmissionsRepository,
                dataSourceRowsRepository,
                googleDriveGateway,
                spreadsheetContentExtractorFactory,
                externalUserAccountsRepository,
                googleAuthGateway,
                bucket,
                transactionManager,
            )

        await addDataSourceByDrivePickerUseCase.execute({
            certificateId: rawData.certificateId,
            fileId: parsedData.fileId,
            userId,
        })
    } catch (error: any) {
        console.log(error)

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
