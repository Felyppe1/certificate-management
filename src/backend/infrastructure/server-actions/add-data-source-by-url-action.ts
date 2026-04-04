'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'

import { logoutAction } from './logout-action'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { AddDataSourceByUrlUseCase } from '@/backend/application/add-data-source-by-url-use-case'
import { SpreadsheetContentExtractorFactory } from '../factory/spreadsheet-content-extractor-factory'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { addDataSourceByUrlSchema } from './schemas'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'
import { PrismaUsersRepository } from '../repository/prisma/prisma-users-repository'
import { redirect } from 'next/navigation'

export async function addDataSourceByUrlAction(_: unknown, formData: FormData) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
        fileUrls: formData.getAll('fileUrls') as string[],
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = addDataSourceByUrlSchema.parse(rawData)

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
        const bucket = new GcpBucket()
        const transactionManager = new PrismaTransactionManager(prisma)
        const usersRepository = new PrismaUsersRepository(prisma)

        const addDataSourceByUrlUseCase = new AddDataSourceByUrlUseCase(
            certificateEmissionsRepository,
            dataSourceRowsRepository,
            googleDriveGateway,
            spreadsheetContentExtractorFactory,
            bucket,
            transactionManager,
            usersRepository,
        )

        await addDataSourceByUrlUseCase.execute({
            certificateId: parsedData.certificateId,
            fileUrls: parsedData.fileUrls,
            userId,
        })

        return {
            success: true,
        }
    } catch (error: any) {
        console.log(error)

        globalThis.logger?.emit({
            severityText: 'ERROR',
            body: 'Error adding data source by URL',
            attributes: {
                err: error,
                message: 'Error adding data source by URL',
                certificateId: rawData.certificateId,
            },
        })

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
