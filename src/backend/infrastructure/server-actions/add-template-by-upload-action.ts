'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { prisma } from '../repository/prisma'
import { AddTemplateByUploadUseCase } from '@/backend/application/add-template-by-upload-use-case'
import { FileContentExtractorFactory } from '../factory/file-content-extractor-factory'
import { updateTag } from 'next/cache'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'
import { logoutAction } from './logout-action'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { addTemplateByUploadSchema } from './schemas'

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

        const bucket = new GcpBucket()
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const transactionManager = new PrismaTransactionManager(prisma)

        const addTemplateByUploadUseCase = new AddTemplateByUploadUseCase(
            bucket,
            certificatesRepository,
            dataSourceRowsRepository,
            fileContentExtractorFactory,
            transactionManager,
        )

        await addTemplateByUploadUseCase.execute({
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
