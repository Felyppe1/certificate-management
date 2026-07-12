'use server'

import { AddTemplateByUrlUseCase } from '@/backend/application/add-template-by-url-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { FileContentExtractorFactory } from '@/backend/interface-adapters/factory/file-content-extractor-factory'
import { GoogleAuthGateway } from '@/backend/interface-adapters/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/interface-adapters/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-certificates-repository'

import { prisma } from '@/backend/infrastructure/repository/prisma'
import { logoutAction } from './logout-action'
import { GcpBucket } from '../../interface-adapters/cloud/gcp/gcp-bucket'
import { PrismaTransactionManager } from '../../interface-adapters/repository/prisma/prisma-transaction-manager'
import { addTemplateByUrlSchema } from './schemas'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { PrismaDataSourceRowsRepository } from '../../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { LiquidStringVariableExtractor } from '../../interface-adapters/string-variable-extractor/liquidjs'
import { PrismaUsersRepository } from '../../interface-adapters/repository/prisma/write/prisma-users-repository'
import { redirect } from 'next/navigation'
import { gcpStorage } from '../cloud/gcp'

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
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const bucket = new GcpBucket(gcpStorage)
        const transactionManager = new PrismaTransactionManager(prisma)
        const stringVariableExtractor = new LiquidStringVariableExtractor()
        const usersRepository = new PrismaUsersRepository(prisma)

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepository,
            dataSourceRowsRepository,
            googleDriveGateway,
            fileContentExtractorFactory,
            bucket,
            transactionManager,
            stringVariableExtractor,
            usersRepository,
        )

        await addTemplateByUrlUseCase.execute({
            certificateId: parsedData.certificateId,
            fileUrl: parsedData.fileUrl,
            userId,
        })

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
            await logoutAction()
            redirect(`/entrar?error=${error.type}`)
        }

        return {
            success: false,
            errorType: error.type,
        }
    }
}
