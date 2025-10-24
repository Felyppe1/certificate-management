'use server'

import { CreateCertificateEmissionUseCase } from '@/backend/application/create-certificate-emission-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z from 'zod'
import { logoutAction } from './logout-action'
import { UpdateCertificateEmissionUseCase } from '@/backend/application/update-certificate-emission-use-case'

const updateCertificateEmissionActionSchema = z.object({
    name: z
        .string()
        .min(1, 'Nome da emissão precisa ter no mínimo 3 caracteres')
        .max(100, 'Nome da emissão pode ter no máximo 100 caracteres')
        .optional(),
    id: z.string().min(1, 'ID da emissão é obrigatório'),
    variableColumnMapping: z
        .record(z.string(), z.string().nullable())
        .nullable()
        .optional(),
})

export async function updateCertificateEmissionAction(
    _: unknown,
    formData: FormData,
) {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

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
        if (!sessionToken) {
            throw new AuthenticationError('missing-session')
        }

        const parsedData = updateCertificateEmissionActionSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository()
        const sessionsRepository = new PrismaSessionsRepository()

        const updateCertificateEmissionUseCase =
            new UpdateCertificateEmissionUseCase(
                certificatesRepository,
                sessionsRepository,
            )

        await updateCertificateEmissionUseCase.execute({
            id: parsedData.id,
            name: parsedData.name,
            variableColumnMapping: parsedData.variableColumnMapping,
            sessionToken,
        })

        revalidateTag('certificate')
    } catch (error) {
        console.log(error)

        if (error instanceof AuthenticationError) {
            await logoutAction()
        }

        return {
            success: false,
            message: 'Ocorreu um erro ao editar a emissão de certificado',
        }
    }
}
