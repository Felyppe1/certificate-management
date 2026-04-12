'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { UpdateDataSourceColumnsUseCase } from '@/backend/application/update-data-source-columns-use-case'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'
import { prisma } from '../repository/prisma'
import { logoutAction } from './logout-action'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { updateDataSourceColumnsSchema } from './schemas'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { redirect } from 'next/navigation'

export async function updateDataSourceColumnsAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
        columns: formData.get('columns')
            ? JSON.parse(formData.get('columns') as string)
            : [],
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = updateDataSourceColumnsSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const transactionManager = new PrismaTransactionManager(prisma)

        const updateDataSourceUseCase = new UpdateDataSourceColumnsUseCase(
            certificatesRepository,
            dataSourceRowsRepository,
            transactionManager,
        )

        const columns = parsedData.columns.map(col => ({
            name: col.name,
            type: col.type,
            arrayMetadata:
                col.type === 'array' && col.arraySeparator && col.arrayItemType
                    ? {
                          separator: col.arraySeparator,
                          itemType: col.arrayItemType,
                      }
                    : null,
        }))

        const result = await updateDataSourceUseCase.execute({
            userId,
            certificateId: parsedData.certificateId,
            columns,
        })

        if (result.invalidColumns.length > 0) {
            return {
                success: false,
                errorType: 'invalid-column-types',
                invalidColumns: result.invalidColumns,
            }
        }

        return {
            success: true,
        }
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
