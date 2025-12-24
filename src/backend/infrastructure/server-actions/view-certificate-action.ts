'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import z from 'zod'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { ViewCertificateUseCase } from '@/backend/application/view-certificate-use-case'

const viewCertificateActionSchema = z.object({
    certificateEmissionId: z
        .string()
        .min(1, 'ID da emissão de certificado é obrigatório'),
    certificateIndex: z.coerce.number().int().min(0),
})

export async function viewCertificateAction(_: unknown, formData: FormData) {
    const rawData = {
        certificateEmissionId: formData.get('certificateEmissionId') as string,
        certificateIndex: formData.get('certificateIndex'),
    }
    try {
        const sessionToken = await getSessionToken()

        const parsedData = viewCertificateActionSchema.parse(rawData)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const bucket = new GcpBucket()

        const viewCertificateUseCase = new ViewCertificateUseCase(
            bucket,
            certificatesRepository,
            sessionsRepository,
            dataSetsRepository,
        )

        const signedUrl = await viewCertificateUseCase.execute({
            certificateEmissionId: parsedData.certificateEmissionId,
            sessionToken,
            certificateIndex: parsedData.certificateIndex,
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
            message:
                error.message ||
                'Erro ao gerar URL do certificado. Tente novamente.',
        }
    }
}
