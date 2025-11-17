import { GetCertificateEmissionUseCase } from '@/backend/application/get-certificate-emission-use-case'
import { UpdateCertificateEmissionUseCase } from '@/backend/application/update-certificate-emission-use-case'
import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'
import { GENERATION_STATUS } from '@/backend/domain/data-set'
import { DATA_SOURCE_FILE_EXTENSION } from '@/backend/domain/data-source'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { INPUT_METHOD } from '@/backend/domain/certificate'
import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { getSessionToken } from '@/utils/middleware/getSessionToken'
import { handleError } from '@/utils/handle-error'
import z from 'zod'
import {
    EMAIL_ERROR_TYPE_ENUM,
    PROCESSING_STATUS_ENUM,
} from '@/backend/domain/email'

export interface GetCertificateEmissionControllerResponse {
    certificateEmission: {
        id: string
        name: string
        userId: string
        status: CERTIFICATE_STATUS
        createdAt: Date
        variableColumnMapping: Record<string, string | null>
        template: {
            driveFileId: string | null
            storageFileUrl: string | null
            inputMethod: INPUT_METHOD
            fileName: string
            fileExtension: TEMPLATE_FILE_EXTENSION
            variables: string[]
            thumbnailUrl: string | null
        } | null
        dataSource: {
            driveFileId: string | null
            storageFileUrl: string | null
            inputMethod: INPUT_METHOD
            fileName: string
            fileExtension: DATA_SOURCE_FILE_EXTENSION
            columns: string[]
            thumbnailUrl: string | null
            dataSet: {
                id: string
                generationStatus: GENERATION_STATUS | null
                totalBytes: number
                rows: Record<string, any>[]
            }
        } | null
        email: {
            subject: string
            body: string
            scheduledAt: Date | null
            emailColumn: string | null
            emailErrorType: EMAIL_ERROR_TYPE_ENUM | null
            status: PROCESSING_STATUS_ENUM
        } | null
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
) {
    const cookie = await cookies()

    const { certificateEmissionId } = await params

    const sessionsRepository = new PrismaSessionsRepository(prisma)

    const getCertificateUseCase = new GetCertificateEmissionUseCase(
        sessionsRepository,
    )

    try {
        const sessionToken = cookie.get('session_token')?.value

        if (!sessionToken) {
            throw new AuthenticationError('missing-session')
        }

        const certificateEmission = await getCertificateUseCase.execute({
            certificateId: certificateEmissionId,
            sessionToken,
        })

        return Response.json({ certificateEmission })
    } catch (error: any) {
        console.log(error.message)

        if (error instanceof AuthenticationError) {
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

const updateCertificateEmissionSchema = z.object({
    name: z
        .string()
        .min(1, 'Emission name must have at least 3 characters')
        .max(100, 'Emission name must have at most 100 characters')
        .optional(),
    variableColumnMapping: z
        .record(z.string(), z.string().nullable())
        .nullable()
        .optional(),
})

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ certificateEmissionId: string }> },
) {
    const certificateEmissionId = (await params).certificateEmissionId

    try {
        const sessionToken = await getSessionToken(request)

        const body = await request.json()
        const parsed = updateCertificateEmissionSchema.parse(body)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)

        const updateCertificateEmissionUseCase =
            new UpdateCertificateEmissionUseCase(
                certificatesRepository,
                sessionsRepository,
            )

        await updateCertificateEmissionUseCase.execute({
            id: certificateEmissionId,
            name: parsed.name,
            variableColumnMapping: parsed.variableColumnMapping,
            sessionToken,
        })

        return new Response(null, { status: 204 })
    } catch (error: any) {
        return await handleError(error)
    }
}
