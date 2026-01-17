'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'
import { GcpPubSub } from '../cloud/gcp/gcp-pubsub'
import { RetryDataSourceRowUseCase } from '@/backend/application/generate-certificate-use-case'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { retryDataSourceRowSchema } from './schemas'

export async function retryDataSourceRowAction(_: unknown, formData: FormData) {
    const rawData = {
        rowId: formData.get('rowId') as string,
    }
    try {
        const { userId } = await validateSessionToken()

        const parsedData = retryDataSourceRowSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const pubSub = new GcpPubSub()

        const retryDataSourceRowUseCase = new RetryDataSourceRowUseCase(
            certificatesRepository,
            dataSourceRowsRepository,
            pubSub,
        )

        await retryDataSourceRowUseCase.execute({
            rowId: parsedData.rowId,
            userId,
        })

        return {
            success: true,
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
            errorType: error.type || 'unknown',
        }
    }
}
