'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { ViewCertificateEmissionsUseCase } from '@/backend/application/view-certificate-emissions-use-case'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { viewCertificatesSchema } from './schemas'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'

export async function viewCertificatesAction(_: unknown, formData: FormData) {
    const rawData = {
        rowIds: JSON.parse(formData.get('rowIds') as string) as string[],
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = viewCertificatesSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const bucket = new GcpBucket()
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )

        const viewCertificatesUseCase = new ViewCertificateEmissionsUseCase(
            bucket,
            certificatesRepository,
            dataSourceRowsRepository,
        )

        const results = await viewCertificatesUseCase.execute({
            userId,
            rowIds: parsedData.rowIds,
        })

        return {
            success: true,
            data: results,
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
