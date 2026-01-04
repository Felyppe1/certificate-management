'use server'

import { AddTemplateByUrlUseCase } from '@/backend/application/add-template-by-url-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'

import { prisma } from '@/backend/infrastructure/repository/prisma'
import { updateTag } from 'next/cache'
import { logoutAction } from './logout-action'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { addTemplateByUrlSchema } from './schemas'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'

export async function addTemplateByUrlAction(_: unknown, formData: FormData) {
    // add delay
    await new Promise(resolve => setTimeout(resolve, 5000))
    const rawData = {
        certificateId: formData.get('certificateId') as string,
        fileUrl: formData.get('fileUrl') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = addTemplateByUrlSchema.parse(rawData)

        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const bucket = new GcpBucket()
        const transactionManager = new PrismaTransactionManager(prisma)

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepository,
            dataSetsRepository,
            googleDriveGateway,
            fileContentExtractorFactory,
            bucket,
            transactionManager,
        )

        await addTemplateByUrlUseCase.execute({
            certificateId: parsedData.certificateId,
            fileUrl: parsedData.fileUrl,
            userId,
        })

        updateTag('certificate')

        return {
            success: true,
        }
    } catch (error: any) {
        console.log(error)

        globalThis.logger?.emit({
            severityText: 'ERROR',
            body: 'Error adding template by URL',
            attributes: {
                err: error,
                message: 'Error adding template by URL',
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
            }
        }

        return {
            success: false,
            errorType: error.type,
        }
    }
}
