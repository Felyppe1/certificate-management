'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { logoutAction } from './logout-action'
import { UpdateCertificateEmissionUseCase } from '@/backend/application/update-certificate-emission-use-case'
import { PrismaDataSourceRowsRepository } from '../repository/prisma/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'
import { validateSessionToken } from '@/app/api/_middleware/validateSessionToken'
import { updateCertificateEmissionSchema } from './schemas'
import { redirect } from 'next/navigation'

export async function updateCertificateEmissionAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        name: formData.get('name') ?? undefined,
        id: formData.get('id') as string,
        variableColumnMapping:
            formData.get('variableColumnMapping') === 'undefined'
                ? undefined
                : formData.get('variableColumnMapping')
                  ? JSON.parse(formData.get('variableColumnMapping') as string)
                  : null,
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
