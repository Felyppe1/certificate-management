'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { ViewCertificateUseCase } from '@/backend/application/view-certificate-use-case'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { viewCertificateSchema } from './schemas'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'

export async function viewCertificateAction(_: unknown, formData: FormData) {
    const rawData = {
        rowId: formData.get('rowId') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = viewCertificateSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const bucket = new GcpBucket()
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )

        const viewCertificateUseCase = new ViewCertificateUseCase(
            bucket,
            certificatesRepository,
            dataSourceRowsRepository,
        )

        const signedUrl = await viewCertificateUseCase.execute({
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
