'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { RetryCertificatesGenerationUseCase } from '@/backend/application/retry-certificates-generation-use-case'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'
import { CloudTasksQueue } from '../cloud/gcp/cloud-tasks-queue'
import { LocalQueue } from '../cloud/local/local-queue'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { retryCertificatesGenerationSchema } from './schemas'
import { redirect } from 'next/navigation'
import { env } from '@/env'

export async function retryCertificatesGenerationAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = retryCertificatesGenerationSchema.parse(rawData)

        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const queue =
            env.NODE_ENV === 'development'
                ? new LocalQueue()
                : new CloudTasksQueue()

        const retryCertificatesGenerationUseCase =
            new RetryCertificatesGenerationUseCase(
                certificateEmissionsRepository,
                dataSourceRowsRepository,
                dataSourceRowsRepository,
                queue,
            )

        const result = await retryCertificatesGenerationUseCase.execute({
            certificateEmissionId: parsedData.certificateId,
            userId,
        })

        return {
            success: true,
            data: {
                totalRetrying: result.totalRetrying,
            },
        }
    } catch (error: any) {
        console.log(error)

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
