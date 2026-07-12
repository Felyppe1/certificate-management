'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '../../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { CloudTasksQueue } from '../../interface-adapters/cloud/gcp/cloud-tasks-queue'
import { LocalQueue } from '../../interface-adapters/cloud/local/local-queue'
import { RetryDataSourceRowUseCase } from '@/backend/application/generate-certificate-use-case'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { retryDataSourceRowSchema } from './schemas'
import { redirect } from 'next/navigation'
import { env } from '@/env'
import { gcpCloudTasks } from '../cloud/gcp'

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
        const queue =
            env.NODE_ENV !== 'production' || env.IS_E2E
                ? new LocalQueue()
                : new CloudTasksQueue(gcpCloudTasks)

        const retryDataSourceRowUseCase = new RetryDataSourceRowUseCase(
            certificatesRepository,
            dataSourceRowsRepository,
            queue,
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
            await logoutAction()
            redirect(`/entrar?error=${error.type}`)
        }

        return {
            success: false,
            errorType: error.type || 'unknown',
        }
    }
}
