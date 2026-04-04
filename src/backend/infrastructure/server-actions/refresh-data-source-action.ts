'use server'

import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaUsersRepository } from '../repository/prisma/prisma-users-repository'
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
import { redirect } from 'next/navigation'

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
        const usersRepository = new PrismaUsersRepository(prisma)
        const transactionManager = new PrismaTransactionManager(prisma)

        const refreshDataSourceUseCase = new RefreshDataSourceUseCase(
            certificatesRepository,
            dataSourceRowsRepository,
            googleDriveGateway,
            googleAuthGateway,
            spreadsheetContentExtractorFactory,
            usersRepository,
            transactionManager,
        )

        await refreshDataSourceUseCase.execute({
            userId,
            certificateId: parsedData.certificateId,
        })

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
                redirect(`/entrar?error=${error.type}`)
            }
        }

        return {
            success: false,
            errorType: error.type,
        }
    }
}
