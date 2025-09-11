'use server'

import { DeleteTemplateUseCase } from '@/backend/application/delete-template-use-case'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { RedisSessionsRepository } from '@/backend/infrastructure/repository/redis/redis-sessions-repository'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z from 'zod'

export async function deleteTemplateAction(_: unknown, formData: FormData) {
    const cookie = await cookies()

    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const sessionToken = cookie.get('session_token')!.value

        const parsedData = z
            .object({
                certificateId: z
                    .string()
                    .min(1, 'ID do certificado é obrigatório'),
            })
            .parse(rawData)

        const sessionsRepository = new RedisSessionsRepository()
        const certificatesRepository = new PrismaCertificatesRepository()

        const deleteTemplateUseCase = new DeleteTemplateUseCase(
            certificatesRepository,
            sessionsRepository,
        )

        await deleteTemplateUseCase.execute({
            certificateId: parsedData.certificateId,
            sessionToken,
        })

        revalidateTag('certificate')

        return { success: true }
    } catch (error) {
        // TODO: tratar erros
        console.error('Error deleting template:', error)

        return {
            success: false,
            message: 'Ocorreu um erro ao deletar o template',
        }
    }
}
