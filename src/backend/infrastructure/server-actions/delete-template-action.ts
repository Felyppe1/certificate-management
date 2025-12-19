'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { DeleteTemplateUseCase } from '@/backend/application/delete-template-use-case'
import { updateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z from 'zod'
import { logoutAction } from './logout-action'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'

export async function deleteTemplateAction(_: unknown, formData: FormData) {
    const cookie = await cookies()

    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const sessionToken = cookie.get('session_token')?.value

        if (!sessionToken) {
            throw new AuthenticationError('missing-session')
        }

        const parsedData = z
            .object({
                certificateId: z
                    .string()
                    .min(1, 'ID do certificado é obrigatório'),
            })
            .parse(rawData)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const bucket = new GcpBucket()

        const deleteTemplateUseCase = new DeleteTemplateUseCase(
            certificateEmissionsRepository,
            dataSetsRepository,
            sessionsRepository,
            bucket,
        )

        await deleteTemplateUseCase.execute({
            certificateId: parsedData.certificateId,
            sessionToken,
        })

        updateTag('certificate')

        return { success: true, message: 'Template deletado com sucesso' }
    } catch (error) {
        console.error('Error deleting template:', error)

        if (error instanceof AuthenticationError) {
            await logoutAction()
        }

        return {
            success: false,
            message: 'Ocorreu um erro ao deletar o template',
        }
    }
}
