'use server'

import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { updateTag } from 'next/cache'
import { PrismaExternalUserAccountsRepository } from '../repository/prisma/prisma-external-user-accounts-repository'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { GoogleAuthGateway } from '../gateway/google-auth-gateway'
import { RefreshDataSourceUseCase } from '@/backend/application/refresh-data-source-use-case'
import { SpreadsheetContentExtractorFactory } from '../factory/spreadsheet-content-extractor-factory'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NotFoundError } from '@/backend/domain/error/not-found-error'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { refreshDataSourceSchema } from './schemas'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'

export async function refreshDataSourceAction(_: unknown, formData: FormData) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = refreshDataSourceSchema.parse(rawData)

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
            certificateId: parsedData.certificateId,
        })

        updateTag('certificate')

        return {
            success: true,
        }
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

        if (error instanceof NotFoundError) {
            return {
                success: false,
                errorType: error.type,
            }
        }

        return {
            success: false,
            errorType: error.type,
        }
    }
}
