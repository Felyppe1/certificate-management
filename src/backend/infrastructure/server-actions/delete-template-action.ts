'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { DeleteTemplateUseCase } from '@/backend/application/delete-template-use-case'
import { updateTag } from 'next/cache'
import { logoutAction } from './logout-action'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { deleteTemplateSchema } from './schemas'

export async function deleteTemplateAction(_: unknown, formData: FormData) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = deleteTemplateSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const bucket = new GcpBucket()
        const transactionManager = new PrismaTransactionManager(prisma)

        const deleteTemplateUseCase = new DeleteTemplateUseCase(
            certificatesRepository,
            dataSourceRowsRepository,
            bucket,
            transactionManager,
        )

        await deleteTemplateUseCase.execute({
            certificateId: parsedData.certificateId,
            userId,
        })

        updateTag('certificate')

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting template:', error)

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
}
