'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { updateTag } from 'next/cache'
import { logoutAction } from './logout-action'
import { UpdateCertificateEmissionUseCase } from '@/backend/application/update-certificate-emission-use-case'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { updateCertificateEmissionSchema } from './schemas'

export async function updateCertificateEmissionAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        name: formData.get('name') ?? undefined,
        id: formData.get('id') as string,
        variableColumnMapping: formData.get('variableColumnMapping')
            ? JSON.parse(formData.get('variableColumnMapping') as string)
            : formData.get('variableColumnMapping') === null
              ? null
              : undefined,
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = updateCertificateEmissionSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const dataSourceRowsRepository = new PrismaDataSourceRowsRepository(
            prisma,
        )
        const transactionManager = new PrismaTransactionManager(prisma)

        const updateCertificateEmissionUseCase =
            new UpdateCertificateEmissionUseCase(
                certificatesRepository,
                dataSourceRowsRepository,
                transactionManager,
            )

        await updateCertificateEmissionUseCase.execute({
            id: parsedData.id,
            name: parsedData.name,
            variableColumnMapping: parsedData.variableColumnMapping,
            userId,
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
