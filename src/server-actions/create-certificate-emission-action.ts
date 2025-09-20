'use server'

import { CreateCertificateEmissionUseCase } from '@/backend/application/create-certificate-emission-use-case'
import { UnauthorizedError } from '@/backend/domain/error/unauthorized-error'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { RedisSessionsRepository } from '@/backend/infrastructure/repository/redis/redis-sessions-repository'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import z from 'zod'

const createCertificateEmissionActionSchema = z.object({
    name: z
        .string()
        .min(1, 'Nome da emissão precisa ter no mínimo 3 caracteres')
        .max(100, 'Nome da emissão pode ter no máximo 100 caracteres'),
})

export async function createCertificateEmissionAction(
    _: unknown,
    formData: FormData,
) {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    console.log(sessionToken)

    const rawData = {
        name: formData.get('name') as string,
    }

    let certificateEmissionId: string

    try {
        if (!sessionToken) {
            throw new UnauthorizedError('Session token not present')
        }

        const parsedData = createCertificateEmissionActionSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository()
        const sessionsRepository = new RedisSessionsRepository()

        const createCertificateEmissionUseCase =
            new CreateCertificateEmissionUseCase(
                certificatesRepository,
                sessionsRepository,
            )

        certificateEmissionId = await createCertificateEmissionUseCase.execute({
            name: parsedData.name,
            sessionToken,
        })

        revalidateTag('certificate-emissions')
    } catch (error) {
        // TODO:
        console.log(error)
        return {
            success: false,
            message: 'Ocorreu um erro ao criar a emissão de certificado',
        }
    }

    redirect('/certificados/' + certificateEmissionId)
}
