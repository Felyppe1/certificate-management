'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { logoutAction } from './logout-action'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { DeleteDataSourceUseCase } from '@/backend/application/delete-data-source-use-case'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { deleteDataSourceSchema } from './schemas'
import { redirect } from 'next/navigation'

export async function deleteDataSourceAction(_: unknown, formData: FormData) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = deleteDataSourceSchema.parse(rawData)

        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const bucket = new GcpBucket()

        const deleteDataSourceUseCase = new DeleteDataSourceUseCase(
            certificateEmissionsRepository,
            bucket,
        )

        await deleteDataSourceUseCase.execute({
            certificateId: parsedData.certificateId,
            userId,
        })

        return {
            success: true,
        }
    } catch (error: any) {
        console.error('Error deleting data source:', error)

        if (error instanceof AuthenticationError) {
            if (
                error.type === 'missing-session' ||
                error.type === 'session-not-found' ||
                error.type === 'user-not-found'
            ) {
                await logoutAction()
                redirect(`/entrar?error=${error.type}`)
            }
        }

        return {
            success: false,
            errorType: error.type,
        }
    }
}
