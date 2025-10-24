'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z from 'zod'
import { logoutAction } from './logout-action'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { DeleteDataSourceUseCase } from '@/backend/application/delete-data-source-use-case'

const deleteDataSourceSchema = z.object({
    certificateId: z.string().min(1, 'ID do certificado é obrigatório'),
})

export async function deleteDataSourceAction(_: unknown, formData: FormData) {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        if (!sessionToken) {
            throw new AuthenticationError('missing-session')
        }

        const parsedData = deleteDataSourceSchema.parse(rawData)

        const sessionsRepository = new PrismaSessionsRepository()
        const certificateEmissionsRepository =
            new PrismaCertificatesRepository()
        const bucket = new GcpBucket()

        const deleteDataSourceUseCase = new DeleteDataSourceUseCase(
            certificateEmissionsRepository,
            sessionsRepository,
            bucket,
        )

        await deleteDataSourceUseCase.execute({
            certificateId: parsedData.certificateId,
            sessionToken,
        })
    } catch (error) {
        console.error('Error deleting data source:', error)

        if (error instanceof AuthenticationError) {
            await logoutAction()
        }

        return {
            success: false,
            message: 'Ocorreu um erro ao deletar a fonte de dados',
        }
    }

    revalidateTag('certificate')

    return { success: true }
}
