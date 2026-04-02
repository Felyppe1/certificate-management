'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { DownloadDataSourceUseCase } from '@/backend/application/download-data-source-use-case'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { downloadDataSourceSchema } from './schemas'
import { redirect } from 'next/navigation'

export async function downloadDataSourceAction(_: unknown, formData: FormData) {
    const rawData = {
        certificateEmissionId: formData.get('certificateEmissionId') as string,
        fileIndex: formData.get('fileIndex'),
    }
    try {
        const { userId } = await validateSessionToken()

        const parsedData = downloadDataSourceSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const bucket = new GcpBucket()

        const downloadDataSourceUseCase = new DownloadDataSourceUseCase(
            bucket,
            certificatesRepository,
        )

        const signedUrl = await downloadDataSourceUseCase.execute({
            certificateEmissionId: parsedData.certificateEmissionId,
            fileIndex: parsedData.fileIndex,
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
                redirect(`/entrar?error=${error.type}`)
            }
        }

        return {
            success: false,
            errorType: error.type,
        }
    }
}
