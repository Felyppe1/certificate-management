'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { resendEmailsSchema } from './schemas/index'
import { ResendEmailsUseCase } from '@/backend/application/resend-emails-use-case'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'
import { PrismaEmailsRepository } from '../repository/prisma/prisma-emails-repository'
import { prisma } from '../repository/prisma'
import { CloudTasksQueue } from '../cloud/gcp/cloud-tasks-queue'
import { LocalQueue } from '../cloud/local/local-queue'
import { redirect } from 'next/navigation'

export async function resendEmailsAction(_: unknown, formData: FormData) {
    const rawData = {
        certificateId: formData.get('certificateId'),
        rowIds: JSON.parse((formData.get('rowIds') as string) || '[]'),
    }

    try {
        const { userId } = await validateSessionToken()
        const parsedData = resendEmailsSchema.parse(rawData)

        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const emailsRepository = new PrismaEmailsRepository(prisma)
        const queue =
            process.env.NODE_ENV === 'development'
                ? new LocalQueue()
                : new CloudTasksQueue()

        const resendEmailsUseCase = new ResendEmailsUseCase(
            certificateEmissionsRepository,
            dataSourceRowsRepository,
            emailsRepository,
            queue,
        )

        await resendEmailsUseCase.execute({
            userId,
            certificateEmissionId: parsedData.certificateId,
            rowIds: parsedData.rowIds,
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
                redirect(`/entrar?error=${error.type}`)
            }
        }

        return { success: false, errorType: error.type }
    }
}
