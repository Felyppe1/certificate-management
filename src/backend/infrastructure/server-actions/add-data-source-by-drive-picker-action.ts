'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'
import z from 'zod'
import { logoutAction } from './logout-action'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { AddDataSourceByDrivePickerUseCase } from '@/backend/application/add-data-source-by-drive-picker-use-case'
import { SpreadsheetContentExtractorFactory } from '../factory/spreadsheet-content-extractor-factory'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { addDataSourceByDrivePickerSchema } from './schemas'
import { redirect } from 'next/navigation'

export async function addDataSourceByDrivePickerAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
        fileIds: formData.getAll('fileIds') as string[],
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
        const usersRepository = new PrismaUsersRepository(prisma)
        const bucket = new GcpBucket()
        const transactionManager = new PrismaTransactionManager(prisma)

        const addDataSourceByDrivePickerUseCase =
            new AddDataSourceByDrivePickerUseCase(
                certificateEmissionsRepository,
                dataSourceRowsRepository,
                googleDriveGateway,
                spreadsheetContentExtractorFactory,
                usersRepository,
                googleAuthGateway,
                bucket,
                transactionManager,
            )

        await addDataSourceByDrivePickerUseCase.execute({
            certificateId: rawData.certificateId,
            fileIds: parsedData.fileIds,
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
                redirect(`/entrar?error=${error.type}`)
            }
        }

        return {
            success: false,
            errorType: error.type,
        }
    }

    return {
        success: true,
    }
}
