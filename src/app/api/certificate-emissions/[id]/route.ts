import { GetCertificateEmissionUseCase } from '@/backend/application/get-certificate-emission-use-case'
import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'
import {
    INPUT_METHOD,
    TEMPLATE_FILE_EXTENSION,
} from '@/backend/domain/template'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { cookies } from 'next/headers'

export interface GetCertificateEmissionControllerResponse {
    certificateEmission: {
        id: string
        name: string
        userId: string
        status: CERTIFICATE_STATUS
        createdAt: Date
        template: {
            id: string
            driveFileId: string | null
            storageFileUrl: string | null
            inputMethod: INPUT_METHOD
            fileName: string
            fileExtension: TEMPLATE_FILE_EXTENSION
            variables: string[]
        } | null
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const cookie = await cookies()

    const { id: certificateId } = await params

    const sessionsRepository = new PrismaSessionsRepository()

    const getCertificateUseCase = new GetCertificateEmissionUseCase(
        sessionsRepository,
    )

    try {
        const sessionToken = cookie.get('session_token')!.value

        const certificateEmission = await getCertificateUseCase.execute({
            certificateId,
            sessionToken,
        })

        return Response.json({ certificateEmission })
    } catch (error: any) {
        console.log(error.message)
        return Response.json({ message: 'Ocorreu um erro' }, { status: 500 })
    }
}
