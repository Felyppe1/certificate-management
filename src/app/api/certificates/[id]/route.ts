import { GetCertificateUseCase } from '@/backend/application/get-certificate-use-case'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { cookies } from 'next/headers'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const cookie = await cookies()

    const { id: certificateId } = await params

    const sessionsRepository = new PrismaSessionsRepository()

    const getCertificateUseCase = new GetCertificateUseCase(sessionsRepository)

    try {
        const sessionToken = cookie.get('session_token')!.value

        const certificate = await getCertificateUseCase.execute({
            certificateId,
            sessionToken,
        })

        return Response.json({ certificate })
    } catch (error) {
        console.log(error.message)
        return Response.json({ message: 'Ocorreu um erro' }, { status: 500 })
    }
}
