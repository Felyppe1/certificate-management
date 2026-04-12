import { prisma } from '@/backend/infrastructure/repository/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { handleError, HandleErrorResponse } from '@/app/api/_utils/handle-error'
import z from 'zod'
import { sseBroker } from '@/backend/infrastructure/sse'
import { PROCESSING_STATUS_ENUM } from '@/backend/domain/email'
import { FinishCertificateEmailSendingProcessUseCase } from '@/backend/application/finish-certificate-email-sending-process-use-case'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaEmailsRepository } from '@/backend/infrastructure/repository/prisma/prisma-emails-repository'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { validateServiceAccountToken } from '@/app/api/_middleware/validateServiceAccountToken'
import { PrismaUsersRepository } from '@/backend/infrastructure/repository/prisma/prisma-users-repository'

const updateEmailSchema = z.object({
    status: z.enum([
        PROCESSING_STATUS_ENUM.COMPLETED,
        PROCESSING_STATUS_ENUM.FAILED,
    ]),
    emailsSentCount: z.number().int().positive().optional(),
    userId: z.string().optional(),
})

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ emailId: string }> },
): Promise<NextResponse<null | HandleErrorResponse>> {
    const emailId = (await params).emailId

    try {
        await validateServiceAccountToken(request)

        const body = await request.json()
        const parsed = updateEmailSchema.parse(body)

        const emailsRepository = new PrismaEmailsRepository(prisma)
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const usersRepository = new PrismaUsersRepository(prisma)
        const transactionManager = new PrismaTransactionManager(prisma)

        const finishCertificateEmailSendingProcessUseCase =
            new FinishCertificateEmailSendingProcessUseCase(
                emailsRepository,
                certificateEmissionsRepository,
                usersRepository,
                transactionManager,
            )

        await finishCertificateEmailSendingProcessUseCase.execute({
            emailId,
            status: parsed.status,
            emailsSentCount: parsed.emailsSentCount,
            userId: parsed.userId,
        })

        sseBroker.sendEvent(emailId, {
            status: parsed.status,
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
