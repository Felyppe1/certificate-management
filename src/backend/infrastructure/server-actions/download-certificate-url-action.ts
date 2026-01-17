'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { DownloadCertificateUseCase } from '@/backend/application/download-certificate-use-case'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { downloadCertificateUrlSchema } from './schemas'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'

export async function downloadCertificateUrlAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateEmissionId: formData.get('certificateEmissionId') as string,
        certificateIndex: formData.get('certificateIndex'),
    }
    try {
        const { userId } = await validateSessionToken()

        const parsedData = downloadCertificateUrlSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const bucket = new GcpBucket()

        const downloadCertificateUseCase = new DownloadCertificateUseCase(
            bucket,
            certificatesRepository,
            dataSourceRowsRepository,
        )

        const signedUrl = await downloadCertificateUseCase.execute({
            userId,
            rowId: parsedData.rowId,
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
