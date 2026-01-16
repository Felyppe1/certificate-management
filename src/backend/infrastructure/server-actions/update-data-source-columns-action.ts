'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { UpdateDataSourceColumnsUseCase } from '@/backend/application/update-data-source-columns-use-case'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'
import { prisma } from '../repository/prisma'
import { updateTag } from 'next/cache'
import { logoutAction } from './logout-action'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { updateDataSourceColumnsSchema } from './schemas'

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

        const updateDataSourceUseCase = new UpdateDataSourceColumnsUseCase(
            certificatesRepository,
            dataSourceRowsRepository,
        )

        const columns = parsedData.columns.map(col => ({
            name: col.name,
            type: col.type,
            arrayMetadata:
                col.type === 'array' && col.arraySeparator
                    ? { separator: col.arraySeparator }
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
    } catch (error: any) {
        console.log(error)

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

    updateTag('certificate')

    return {
        success: true,
    }
}
