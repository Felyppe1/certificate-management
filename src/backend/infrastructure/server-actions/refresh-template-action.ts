'use server'

import { RefreshTemplateUseCase } from '@/backend/application/refresh-template-use-case'
import { FileContentExtractorFactory } from '@/backend/interface-adapters/factory/file-content-extractor-factory'
import { GoogleDriveGateway } from '@/backend/interface-adapters/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaUsersRepository } from '../../interface-adapters/repository/prisma/write/prisma-users-repository'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { GoogleAuthGateway } from '../../interface-adapters/gateway/google-auth-gateway'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaDataSourceRowsRepository } from '../../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { NotFoundError } from '@/backend/domain/error/not-found-error'
import { PrismaTransactionManager } from '../../interface-adapters/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { refreshTemplateSchema } from './schemas'
import { GcpBucket } from '../../interface-adapters/cloud/gcp/gcp-bucket'
import { LiquidStringVariableExtractor } from '../../interface-adapters/string-variable-extractor/liquidjs'
import { redirect } from 'next/navigation'
import { gcpStorage } from '../cloud/gcp'

export async function refreshTemplateAction(_: unknown, formData: FormData) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = refreshTemplateSchema.parse(rawData)

        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const usersRepository = new PrismaUsersRepository(prisma)
        const transactionManager = new PrismaTransactionManager(prisma)
        const bucket = new GcpBucket(gcpStorage)
        const stringVariableExtractor = new LiquidStringVariableExtractor()

        const refreshTemplateUseCase = new RefreshTemplateUseCase(
            certificatesRepository,
            dataSourceRowsRepository,
            googleDriveGateway,
            googleAuthGateway,
            fileContentExtractorFactory,
            usersRepository,
            transactionManager,
            bucket,
            stringVariableExtractor,
        )

        await refreshTemplateUseCase.execute({
            userId,
            certificateId: parsedData.certificateId,
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
