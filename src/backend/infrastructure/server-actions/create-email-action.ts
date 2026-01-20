'use server'

import { CreateEmailUseCase } from '@/backend/application/create-email-use-case'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { prisma } from '../repository/prisma'
import { PrismaEmailsRepository } from '../repository/prisma/prisma-emails-repository'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { updateTag } from 'next/cache'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { createEmailSchema } from './schemas'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'
import { CloudTasksQueue } from '../cloud/gcp/cloud-tasks-queue'
import { LocalQueue } from '../cloud/local/local-queue'

export async function createEmailAction(_: unknown, formData: FormData) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
        subject: formData.get('subject') as string,
        body: formData.get('body') as string,
        emailColumn: formData.get('emailColumn') as string,
        scheduledAt: formData.get('scheduledAt')
            ? new Date(formData.get('scheduledAt') as string)
            : null,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = createEmailSchema.parse(rawData)

        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const emailsRepository = new PrismaEmailsRepository(prisma)
        const transactionManager = new PrismaTransactionManager(prisma)
        const queue =
            process.env.NODE_ENV === 'development'
                ? new LocalQueue()
                : new CloudTasksQueue()

        const createEmailUseCase = new CreateEmailUseCase(
            certificateEmissionsRepository,
            dataSourceRowsRepository,
            emailsRepository,
            queue,
            transactionManager,
        )

        await createEmailUseCase.execute({
            userId,
            body: parsedData.body,
            certificateEmissionId: parsedData.certificateId,
            emailColumn: parsedData.emailColumn,
            scheduledAt: parsedData.scheduledAt,
            subject: parsedData.subject,
        })
    } catch (error: any) {
        console.log(error)

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

    updateTag('certificate')

    return {
        success: true,
    }
}
