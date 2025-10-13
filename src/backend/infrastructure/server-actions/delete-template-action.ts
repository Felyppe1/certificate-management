'use server'

import { UnauthorizedError } from '@/backend/domain/error/unauthorized-error'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { DeleteTemplateUseCase } from '@/backend/application/delete-template-use-case'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z from 'zod'
import { logoutAction } from './logout-action'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'

export async function deleteTemplateAction(_: unknown, formData: FormData) {
    const cookie = await cookies()

    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const sessionToken = cookie.get('session_token')?.value

        if (!sessionToken) {
            throw new UnauthorizedError('missing-session')
        }

        const parsedData = z
            .object({
                certificateId: z
                    .string()
                    .min(1, 'ID do certificado é obrigatório'),
            })
            .parse(rawData)

        const sessionsRepository = new PrismaSessionsRepository()
        const certificateEmissionsRepository =
            new PrismaCertificatesRepository()
        const bucket = new GcpBucket()

        const deleteTemplateUseCase = new DeleteTemplateUseCase(
            certificateEmissionsRepository,
            sessionsRepository,
            bucket,
        )

        await deleteTemplateUseCase.execute({
            certificateId: parsedData.certificateId,
            sessionToken,
        })

        revalidateTag('certificate')

        return { success: true }
    } catch (error) {
        console.error('Error deleting template:', error)

        if (error instanceof UnauthorizedError) {
            await logoutAction()
        }

        return {
            success: false,
            message: 'Ocorreu um erro ao deletar o template',
        }
    }
}
