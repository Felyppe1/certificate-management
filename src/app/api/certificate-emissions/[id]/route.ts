import { GetCertificateEmissionUseCase } from '@/backend/application/get-certificate-emission-use-case'
import { RedisSessionsRepository } from '@/backend/infrastructure/repository/redis/redis-sessions-repository'
import { cookies } from 'next/headers'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const cookie = await cookies()

    const { id: certificateId } = await params

    const sessionsRepository = new RedisSessionsRepository()

    const getCertificateUseCase = new GetCertificateEmissionUseCase(
        sessionsRepository,
    )

    try {
        const sessionToken = cookie.get('session_token')!.value

        const certificate = await getCertificateUseCase.execute({
            certificateId,
            sessionToken,
        })

        return Response.json({ certificate })
    } catch (error: any) {
        console.log(error.message)
        return Response.json({ message: 'Ocorreu um erro' }, { status: 500 })
    }
}
