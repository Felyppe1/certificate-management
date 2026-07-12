'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaCertificatesRepository } from '@/backend/interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { DeleteTemplateUseCase } from '@/backend/application/delete-template-use-case'
import { logoutAction } from './logout-action'
import { GcpBucket } from '../../interface-adapters/cloud/gcp/gcp-bucket'
import { PrismaDataSourceRowsRepository } from '../../interface-adapters/repository/prisma/write/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '../../interface-adapters/repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { deleteTemplateSchema } from './schemas'
import { redirect } from 'next/navigation'
import { gcpStorage } from '../cloud/gcp'

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
        const bucket = new GcpBucket(gcpStorage)
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

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting template:', error)

        if (error instanceof AuthenticationError) {
            await logoutAction()
            redirect(`/entrar?error=${error.type}`)
        }

        return {
            success: false,
            errorType: error.type,
        }
    }
}
