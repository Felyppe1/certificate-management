'use server'

import { CreateEmailUseCase } from '@/backend/application/create-email-use-case'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import z from 'zod'
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
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '@/backend/domain/error/validation-error'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'

const createEmailActionSchema = z.object({
    certificateId: z.string().min(1, 'ID do certificado é obrigatório'),
    subject: z
        .string()
        .min(1, 'O assunto do e-mail precisa ter no mínimo 1 caractere')
        .max(255, 'O assunto do e-mail pode ter no máximo 255 caracteres'),
    body: z
        .string()
        .min(1, 'O corpo do e-mail precisa ter no mínimo 1 caractere'),
    emailColumn: z
        .string()
        .min(1, 'A coluna de e-mail precisa ter no mínimo 1 caractere')
        .max(100, 'A coluna de e-mail pode ter no máximo 100 caracteres'),
    scheduledAt: z.date().nullable(),
})

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
        const sessionToken = await getSessionToken()

        const parsedData = createEmailActionSchema.parse(rawData)

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
            sessionToken,
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
                error.type === 'session-not-found'
            ) {
                await logoutAction()
            }

            updateTag('certificate')

            return {
                success: false,
                message: 'Sua conta da Google precisa ser reconectada',
            }
        }

        if (
            error instanceof ValidationError &&
            error.type === VALIDATION_ERROR_TYPE.INVALID_RECIPIENT_EMAIL
        ) {
            return {
                success: false,
                message:
                    'Há pelo menos um e-mail inválido na coluna selecionada',
            }
        }

        return {
            success: false,
            message: 'Ocorreu um erro ao enviar o email',
        }
    }

    updateTag('certificate')

    return {
        success: true,
        message: 'Envio de email disparado com sucesso',
    }
}
