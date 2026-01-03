'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { DownloadTemplateUseCase } from '@/backend/application/download-template-use-case'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { downloadTemplateSchema } from './schemas/certificate-emission-schemas'

export async function downloadTemplateAction(_: unknown, formData: FormData) {
    const rawData = {
        certificateEmissionId: formData.get('certificateEmissionId') as string,
    }
    try {
        const { userId } = await validateSessionToken()

        const parsedData = downloadTemplateSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const bucket = new GcpBucket()

        const downloadTemplateUseCase = new DownloadTemplateUseCase(
            bucket,
            certificatesRepository,
        )

        const signedUrl = await downloadTemplateUseCase.execute({
            certificateEmissionId: parsedData.certificateEmissionId,
            userId,
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
