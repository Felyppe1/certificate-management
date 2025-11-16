import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest } from 'next/server'
import { handleError } from '@/utils/handle-error'
import z from 'zod'
import { verifyServiceAccountToken } from '@/utils/middleware/verifyServiceAccountToken'
import { sseBroker } from '@/backend/infrastructure/sse'
import { PROCESSING_STATUS_ENUM } from '@/backend/domain/email'
import { FinishCertificateEmailSendingProcessUseCase } from '@/backend/application/finish-certificate-email-sending-process-use-case'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaEmailsRepository } from '@/backend/infrastructure/repository/prisma/prisma-emails-repository'

const updateEmailSchema = z.object({
    status: z.enum([
        PROCESSING_STATUS_ENUM.COMPLETED,
        PROCESSING_STATUS_ENUM.FAILED,
    ]),
})

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ emailId: string }> },
) {
    const emailId = (await params).emailId

    try {
        await verifyServiceAccountToken(request)

        const body = await request.json()
        const parsed = updateEmailSchema.parse(body)

        const emailsRepository = new PrismaEmailsRepository(prisma)
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )

        const finishCertificateEmailSendingProcessUseCase =
            new FinishCertificateEmailSendingProcessUseCase(
                emailsRepository,
                certificateEmissionsRepository,
            )

        await finishCertificateEmailSendingProcessUseCase.execute({
            emailId,
            status: parsed.status,
        })

        sseBroker.sendEvent(emailId, {
            status: parsed.status,
        })

        return new Response(null, { status: 204 })
    } catch (error: any) {
        return await handleError(error)
    }
}
