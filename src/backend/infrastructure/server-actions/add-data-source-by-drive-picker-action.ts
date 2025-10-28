'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z from 'zod'
import { logoutAction } from './logout-action'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { AddDataSourceByDrivePickerUseCase } from '@/backend/application/add-data-source-by-drive-picker-use-case'
import { SpreadsheetContentExtractorFactory } from '../factory/spreadsheet-content-extractor-factory'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'

const addDataSourceByDrivePickerActionSchema = z.object({
    certificateId: z.string().min(1, 'ID do certificado é obrigatório'),
    fileId: z.string().min(1, 'ID do arquivo é obrigatório'),
})

export async function addDataSourceByDrivePickerAction(
    _: unknown,
    formData: FormData,
) {
    setTimeout(() => {
        // This is a workaround to make the action asynchronous
    }, 2000)
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    const rawData = {
        certificateId: formData.get('certificateId') as string,
        fileId: formData.get('fileId') as string,
    }

    try {
        if (!sessionToken) {
            throw new AuthenticationError('missing-session')
        }

        const parsedData = addDataSourceByDrivePickerActionSchema.parse(rawData)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)
        const bucket = new GcpBucket()

        const addDataSourceByDrivePickerUseCase =
            new AddDataSourceByDrivePickerUseCase(
                certificateEmissionsRepository,
                dataSetsRepository,
                sessionsRepository,
                googleDriveGateway,
                spreadsheetContentExtractorFactory,
                externalUserAccountsRepository,
                googleAuthGateway,
                bucket,
            )

        await addDataSourceByDrivePickerUseCase.execute({
            certificateId: rawData.certificateId,
            fileId: parsedData.fileId,
            sessionToken,
        })
    } catch (error: any) {
        console.log(error)

        if (error instanceof AuthenticationError) {
            if (
                error.type === 'missing-session' ||
                error.type === 'session-not-found'
            ) {
                await logoutAction()
            }

            return {
                success: false,
                message: 'Sua conta da Google precisa ser reconectada',
            }
        }

        return {
            success: false,
            message: 'Não foi possível adicionar a fonte de dados',
        }
    }

    revalidateTag('certificate')

    return {
        success: true,
        message: 'Template adicionado com sucesso',
    }
}
