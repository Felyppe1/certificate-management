'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GcpBucket } from '../../interface-adapters/cloud/gcp/gcp-bucket'
import { PrismaCertificatesRepository } from '../../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { prisma } from '../repository/prisma'
import { AddTemplateByUploadUseCase } from '@/backend/application/add-template-by-upload-use-case'
import { FileContentExtractorFactory } from '../../interface-adapters/factory/file-content-extractor-factory'
import { PrismaDataSourceRowsRepository } from '../../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { logoutAction } from './logout-action'
import { PrismaTransactionManager } from '../../interface-adapters/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { addTemplateByUploadSchema } from './schemas'
import { LiquidStringVariableExtractor } from '../../interface-adapters/string-variable-extractor/liquidjs'
import { PrismaUsersRepository } from '../../interface-adapters/repository/prisma/write/prisma-users-repository'
import { redirect } from 'next/navigation'
import { gcpStorage } from '../cloud/gcp'

export async function addTemplateByUploadAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
        file: formData.get('file') as File,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = addTemplateByUploadSchema.parse(rawData)

        const bucket = new GcpBucket(gcpStorage)
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const transactionManager = new PrismaTransactionManager(prisma)
        const stringVariableExtractor = new LiquidStringVariableExtractor()

        const usersRepository = new PrismaUsersRepository(prisma)

        const addTemplateByUploadUseCase = new AddTemplateByUploadUseCase(
            bucket,
            certificatesRepository,
            dataSourceRowsRepository,
            fileContentExtractorFactory,
            transactionManager,
            stringVariableExtractor,
            usersRepository,
        )

        await addTemplateByUploadUseCase.execute({
            userId,
            certificateId: parsedData.certificateId,
            file: parsedData.file,
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
