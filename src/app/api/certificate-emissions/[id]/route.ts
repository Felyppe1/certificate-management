import { GetCertificateEmissionUseCase } from '@/backend/application/get-certificate-emission-use-case'
import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'
import { GENERATION_STATUS } from '@/backend/domain/data-set'
import { DATA_SOURCE_FILE_EXTENSION } from '@/backend/domain/data-source'
import { UnauthorizedError } from '@/backend/domain/error/unauthorized-error'
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
        variableColumnMapping: Record<string, string | null>
        template: {
            id: string
            driveFileId: string | null
            storageFileUrl: string | null
            inputMethod: INPUT_METHOD
            fileName: string
            fileExtension: TEMPLATE_FILE_EXTENSION
            variables: string[]
            thumbnailUrl: string | null
        } | null
        dataSource: {
            id: string
            driveFileId: string | null
            storageFileUrl: string | null
            inputMethod: INPUT_METHOD
            fileName: string
            fileExtension: DATA_SOURCE_FILE_EXTENSION
            columns: string[]
            thumbnailUrl: string | null
            dataSet: {
                id: string
                generationStatus: GENERATION_STATUS
                rows: Record<string, any>[]
            }
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
        const sessionToken = cookie.get('session_token')?.value

        if (!sessionToken) {
            throw new UnauthorizedError('missing-session')
        }

        const certificateEmission = await getCertificateUseCase.execute({
            certificateId,
            sessionToken,
        })

        return Response.json({ certificateEmission })
    } catch (error: any) {
        console.log(error.message)

        if (error instanceof UnauthorizedError) {
            return Response.json(
                { type: error.type, title: error.title },
                { status: 401 },
            )
        }

        return Response.json(
            {
                type: 'internal-server-error',
                message:
                    'An unexpected error occurred while getting the certificate emission',
            },
            { status: 500 },
        )
    }
}
