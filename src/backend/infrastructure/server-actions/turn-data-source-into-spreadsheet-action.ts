'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '../../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { GcpBucket } from '../../interface-adapters/cloud/gcp/gcp-bucket'
import { GoogleAuthGateway } from '../../interface-adapters/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '../../interface-adapters/gateway/google-drive-gateway'
import { PrismaUsersRepository } from '../../interface-adapters/repository/prisma/write/prisma-users-repository'
import { TurnDataSourceIntoSpreadsheetUseCase } from '@/backend/application/turn-data-source-into-spreadsheet-use-case'
import { SpreadsheetGeneratorFactory } from '../../interface-adapters/factory/spreadsheet-generator-factory'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { turnDataSourceIntoSpreadsheetSchema } from './schemas'
import { redirect } from 'next/navigation'
import { gcpStorage } from '../cloud/gcp'

export async function turnDataSourceIntoSpreadsheetAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
        format: formData.get('format') as string,
        destination: formData.get('destination') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = turnDataSourceIntoSpreadsheetSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const bucket = new GcpBucket(gcpStorage)

        const googleAuthGateway = new GoogleAuthGateway()
        const driveGateway = new GoogleDriveGateway(googleAuthGateway)
        const usersRepository = new PrismaUsersRepository(prisma)

        const spreadsheetGeneratorFactory = new SpreadsheetGeneratorFactory()

        const useCase = new TurnDataSourceIntoSpreadsheetUseCase(
            certificatesRepository,
            dataSourceRowsRepository,
            bucket,
            spreadsheetGeneratorFactory,
            driveGateway,
            usersRepository,
            googleAuthGateway,
        )

        await useCase.execute({
            certificateId: parsedData.certificateId,
            userId,
            format: parsedData.format,
            destination: parsedData.destination,
        })

        return { success: true }
    } catch (error: any) {
        console.error('Error turning data source into spreadsheet:', error)

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
