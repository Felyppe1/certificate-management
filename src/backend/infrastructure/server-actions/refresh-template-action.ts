'use server'

import { RefreshTemplateUseCase } from '@/backend/application/refresh-template-use-case'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { updateTag } from 'next/cache'
import { PrismaExternalUserAccountsRepository } from '../repository/prisma/prisma-external-user-accounts-repository'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { GoogleAuthGateway } from '../gateway/google-auth-gateway'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'
import { NotFoundError } from '@/backend/domain/error/not-found-error'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { refreshTemplateSchema } from './schemas'

export async function refreshTemplateAction(_: unknown, formData: FormData) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = refreshTemplateSchema.parse(rawData)

        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)
        const transactionManager = new PrismaTransactionManager(prisma)

        const refreshTemplateUseCase = new RefreshTemplateUseCase(
            certificatesRepository,
            dataSetsRepository,
            googleDriveGateway,
            googleAuthGateway,
            fileContentExtractorFactory,
            externalUserAccountsRepository,
            transactionManager,
        )

        await refreshTemplateUseCase.execute({
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
