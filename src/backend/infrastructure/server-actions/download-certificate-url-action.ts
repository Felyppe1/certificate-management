'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '../../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { GcpBucket } from '../../interface-adapters/cloud/gcp/gcp-bucket'
import { DownloadCertificateEmissionUseCase } from '@/backend/application/download-certificate-emission-use-case'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { downloadCertificateUrlSchema } from './schemas'
import { PrismaDataSourceRowsRepository } from '../../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { redirect } from 'next/navigation'
import { gcpStorage } from '../cloud/gcp'

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
        const bucket = new GcpBucket(gcpStorage)

        const downloadCertificateUseCase =
            new DownloadCertificateEmissionUseCase(
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
            await logoutAction()
            redirect(`/entrar?error=${error.type}`)
        }

        return {
            success: false,
            errorType: error.type,
        }
    }
}
