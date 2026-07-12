'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { GenerateCertificatesUseCase } from '@/backend/application/generate-certificates-use-case'
import { PrismaCertificatesRepository } from '../../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { PrismaUsersRepository } from '../../interface-adapters/repository/prisma/write/prisma-users-repository'
import { GoogleAuthGateway } from '../../interface-adapters/gateway/google-auth-gateway'
import { CloudTasksQueue } from '../../interface-adapters/cloud/gcp/cloud-tasks-queue'
import { LocalQueue } from '../../interface-adapters/cloud/local/local-queue'
import { GcpBucket } from '../../interface-adapters/cloud/gcp/gcp-bucket'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { generateCertificatesSchema } from './schemas'
import { redirect } from 'next/navigation'
import { env } from '@/env'
import { gcpCloudTasks, gcpStorage } from '../cloud/gcp'

export async function generateCertificatesAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = generateCertificatesSchema.parse(rawData)

        const bucket = new GcpBucket(gcpStorage)
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const usersRepository = new PrismaUsersRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const queue =
            env.NODE_ENV !== 'production' || env.IS_E2E
                ? new LocalQueue()
                : new CloudTasksQueue(gcpCloudTasks)

        const generateCertificatesUseCase = new GenerateCertificatesUseCase(
            bucket,
            certificateEmissionsRepository,
            usersRepository,
            dataSourceRowsRepository,
            dataSourceRowsRepository,
            queue,
        )

        await generateCertificatesUseCase.execute({
            certificateEmissionId: parsedData.certificateId,
            userId,
        })

        return {
            success: true,
        }
    } catch (error: any) {
        console.log(error)

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
