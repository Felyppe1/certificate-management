'use server'

import { z } from 'zod'
import { prisma } from '../repository/prisma'
import { logoutAction } from './logout-action'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { UpdateDataSourceRowsUseCase } from '@/backend/application/update-data-source-rows-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '@/backend/domain/error/validation-error'
import { updateDataSourceRowsSchema } from './schemas'
import { redirect } from 'next/navigation'

export async function updateDataSourceRowsAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateId: formData.get('certificateId'),
        editedRows: formData.get('editedRows')
            ? JSON.parse(formData.get('editedRows') as string)
            : [],
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = updateDataSourceRowsSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const transactionManager = new PrismaTransactionManager(prisma)

        const updateDataSourceRowsUseCase = new UpdateDataSourceRowsUseCase(
            certificatesRepository,
            dataSourceRowsRepository,
            transactionManager,
        )

        await updateDataSourceRowsUseCase.execute({
            userId,
            certificateId: parsedData.certificateId,
            editedRows: parsedData.editedRows,
        })
    } catch (error: any) {
        console.log(error)

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
