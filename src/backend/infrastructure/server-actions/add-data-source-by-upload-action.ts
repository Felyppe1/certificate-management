'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GcpBucket } from '../../interface-adapters/cloud/gcp/gcp-bucket'
import { PrismaCertificatesRepository } from '../../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { AddDataSourceByUploadUseCase } from '@/backend/application/add-data-source-by-upload-use-case'
import { SpreadsheetContentExtractorFactory } from '../../interface-adapters/factory/spreadsheet-content-extractor-factory'
import { PrismaDataSourceRowsRepository } from '../../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaTransactionManager } from '../../interface-adapters/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { logoutAction } from './logout-action'
import { addDataSourceByUploadSchema } from './schemas'
import { PrismaUsersRepository } from '../../interface-adapters/repository/prisma/write/prisma-users-repository'
import { redirect } from 'next/navigation'
import { gcpStorage } from '../cloud/gcp'

export async function addDataSourceByUploadAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
        files: formData.getAll('files') as File[],
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = addDataSourceByUploadSchema.parse(rawData)

        const bucket = new GcpBucket(gcpStorage)
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()
        const transactionManager = new PrismaTransactionManager(prisma)

        const usersRepository = new PrismaUsersRepository(prisma)

        const addDataSourceByUploadUseCase = new AddDataSourceByUploadUseCase(
            bucket,
            certificatesRepository,
            dataSourceRowsRepository,
            spreadsheetContentExtractorFactory,
            transactionManager,
            usersRepository,
        )

        await addDataSourceByUploadUseCase.execute({
            userId,
            certificateId: parsedData.certificateId,
            files: parsedData.files,
        })

        return {
            success: true,
        }
    } catch (error: any) {
        console.error(error)

        if (error instanceof AuthenticationError) {
            await logoutAction()
            redirect(`/entrar?error=${error.type}`)
        }

        return {
            success: false,
            errorType: error.type,
        }
    }
}
