import { GetAllCertificatesUseCase } from '@/backend/application/get-all-certificates-use-case'
import { RedisSessionsRepository } from '@/backend/infrastructure/repository/redis/redis-sessions-repository'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(/*request: Request, { params }: { params: Promise<{ id: string}>}*/) {
    await new Promise(resolve => setTimeout(resolve, 2000))

    const cookie = await cookies()
    // const { id: userId } = await params

    try {
        const sessionToken = cookie.get('session_token')!.value

        const sessionsRepository = new RedisSessionsRepository()

        const getAllCertificatesUseCase = new GetAllCertificatesUseCase(
            sessionsRepository,
        )

        const certificates = await getAllCertificatesUseCase.execute({
            sessionToken,
            // userId,
        })

        return NextResponse.json({ certificates })
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 })
    }
}
