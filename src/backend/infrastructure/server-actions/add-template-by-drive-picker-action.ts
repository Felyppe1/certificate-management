'use server'

import { AddTemplateByDrivePickerUseCase } from '@/backend/application/add-template-by-drive-picker-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { FileContentExtractorFactory } from '@/backend/interface-adapters/factory/file-content-extractor-factory'
import { GoogleAuthGateway } from '@/backend/interface-adapters/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/interface-adapters/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaUsersRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-users-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { logoutAction } from './logout-action'
import { GcpBucket } from '../../interface-adapters/cloud/gcp/gcp-bucket'
import { PrismaDataSourceRowsRepository } from '../../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '../../interface-adapters/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { addTemplateByDrivePickerSchema } from './schemas'
import { LiquidStringVariableExtractor } from '../../interface-adapters/string-variable-extractor/liquidjs'
import { redirect } from 'next/navigation'
import { gcpStorage } from '../cloud/gcp'

export async function addTemplateByDrivePickerAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
        fileId: formData.get('fileId') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = addTemplateByDrivePickerSchema.parse(rawData)

        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const usersRepository = new PrismaUsersRepository(prisma)
        const bucket = new GcpBucket(gcpStorage)
        const transactionManager = new PrismaTransactionManager(prisma)
        const stringVariableExtractor = new LiquidStringVariableExtractor()

        const addTemplateByDrivePickerUseCase =
            new AddTemplateByDrivePickerUseCase(
                certificateEmissionsRepository,
                googleDriveGateway,
                fileContentExtractorFactory,
                usersRepository,
                dataSourceRowsRepository,
                googleAuthGateway,
                bucket,
                transactionManager,
                stringVariableExtractor,
            )

        await addTemplateByDrivePickerUseCase.execute({
            certificateId: rawData.certificateId,
            fileId: parsedData.fileId,
            userId,
        })
    } catch (error: any) {
        console.log(error)

        if (error instanceof AuthenticationError) {
            await logoutAction()
            redirect(`/entrar?error=${error.type}`)
        }

        return {
            success: false,
            errorType: error.type,
        }
    }

    return {
        success: true,
    }
}
