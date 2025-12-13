'use server'

import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { updateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z from 'zod'
import { PrismaExternalUserAccountsRepository } from '../repository/prisma/prisma-external-user-accounts-repository'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { GoogleAuthGateway } from '../gateway/google-auth-gateway'
import { RefreshDataSourceUseCase } from '@/backend/application/refresh-data-source-use-case'
import { SpreadsheetContentExtractorFactory } from '../factory/spreadsheet-content-extractor-factory'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NotFoundError } from '@/backend/domain/error/not-found-error'

const refreshDataSourceActionSchema = z.object({
    certificateId: z.string().min(1, 'ID do certificado é obrigatório'),
})

export async function refreshDataSourceAction(_: unknown, formData: FormData) {
    const cookie = await cookies()

    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const sessionToken = cookie.get('session_token')!.value

        const parsedData = refreshDataSourceActionSchema.parse(rawData)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository(prisma)

        const refreshDataSourceUseCase = new RefreshDataSourceUseCase(
            certificatesRepository,
            dataSetsRepository,
            sessionsRepository,
            googleDriveGateway,
            googleAuthGateway,
            spreadsheetContentExtractorFactory,
            externalUserAccountsRepository,
        )

        await refreshDataSourceUseCase.execute({
            sessionToken,
            certificateId: parsedData.certificateId,
        })

        updateTag('certificate')

        return {
            success: true,
            message: 'Fonte de dados atualizada com sucesso',
        }
    } catch (error) {
        console.error(error)

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

        if (error instanceof NotFoundError) {
            if (error.type === 'drive-file-not-found') {
                return {
                    success: false,
                    message:
                        'Arquivo não encontrado. Verifique se ele ainda existe no Drive e se está público',
                }
            }
        }

        return {
            success: false,
            message: 'Ocorreu um erro ao tentar atualizar a fonte de dados',
        }
    }
}
