'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { GenerateCertificatesUseCase } from '@/backend/application/generate-certificates-use-case'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'
import { PrismaUsersRepository } from '../repository/prisma/prisma-users-repository'
import { GoogleAuthGateway } from '../gateway/google-auth-gateway'
import { CloudTasksQueue } from '../cloud/gcp/cloud-tasks-queue'
import { LocalQueue } from '../cloud/local/local-queue'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { generateCertificatesSchema } from './schemas'
import { redirect } from 'next/navigation'

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

        const bucket = new GcpBucket()
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const usersRepository = new PrismaUsersRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const queue =
            process.env.NODE_ENV === 'development'
                ? new LocalQueue()
                : new CloudTasksQueue()

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
