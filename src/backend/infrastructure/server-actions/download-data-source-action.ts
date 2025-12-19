'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import z from 'zod'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { DownloadDataSourceUseCase } from '@/backend/application/download-data-source-use-case'

const downloadDataSourceActionSchema = z.object({
    certificateEmissionId: z
        .string()
        .min(1, 'ID da emissão de certificado é obrigatório'),
})

export async function downloadDataSourceAction(_: unknown, formData: FormData) {
    const rawData = {
        certificateEmissionId: formData.get('certificateEmissionId') as string,
    }
    try {
        const sessionToken = await getSessionToken()

        const parsedData = downloadDataSourceActionSchema.parse(rawData)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const bucket = new GcpBucket()

        const downloadDataSourceUseCase = new DownloadDataSourceUseCase(
            bucket,
            certificatesRepository,
            sessionsRepository,
        )

        const signedUrl = await downloadDataSourceUseCase.execute({
            certificateEmissionId: parsedData.certificateEmissionId,
            sessionToken,
        })

        return {
            success: true,
            data: signedUrl,
        }
    } catch (error: any) {
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
                message: 'Sua sessão expirou. Por favor, faça login novamente.',
            }
        }

        return {
            success: false,
            message: 'Ocorreu um erro ao tentar baixar a fonte de dados',
        }
    }
}
