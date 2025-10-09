'use server'

import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
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

        const sessionsRepository = new PrismaSessionsRepository()
        const certificateEmissionsRepository =
            new PrismaCertificatesRepository()

        // TODO: Refatorar para usar o use case
        const certificate = await certificateEmissionsRepository.getById(
            parsedData.certificateId,
        )

        if (!certificate) {
            throw new Error('Certificate not found')
        }

        const session = await sessionsRepository.getById(sessionToken)
        if (!session || certificate.getUserId() !== session.userId) {
            throw new Error('Unauthorized')
        }

        certificate.removeTemplate()

        await certificateEmissionsRepository.update(certificate)

        revalidateTag('certificate')

        return { success: true }
    } catch (error) {
        console.error('Error deleting template:', error)

        return {
            success: false,
            message: 'Ocorreu um erro ao deletar o template',
        }
    }
}
