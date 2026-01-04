'use server'

import { CreateEmailUseCase } from '@/backend/application/create-email-use-case'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { prisma } from '../repository/prisma'
import { PrismaEmailsRepository } from '../repository/prisma/prisma-emails-repository'
import { PrismaSessionsRepository } from '../repository/prisma/prisma-sessions-repository'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'
import { CloudFunctionExternalProcessing } from '../cloud/gcp/cloud-function-external-processing'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { updateTag } from 'next/cache'
import { GoogleAuthGateway } from '../gateway/google-auth-gateway'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { createEmailSchema } from './schemas'

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
        const { token } = await validateSessionToken()

        const parsedData = createEmailSchema.parse(rawData)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const emailsRepository = new PrismaEmailsRepository(prisma)

        const googleAuthGateway = new GoogleAuthGateway()
        const externalProcessing = new CloudFunctionExternalProcessing(
            googleAuthGateway,
        )
        const transactionManager = new PrismaTransactionManager(prisma)

        const createEmailUseCase = new CreateEmailUseCase(
            sessionsRepository,
            certificateEmissionsRepository,
            dataSetsRepository,
            emailsRepository,
            externalProcessing,
            transactionManager,
        )

        await createEmailUseCase.execute({
            sessionToken: token,
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
