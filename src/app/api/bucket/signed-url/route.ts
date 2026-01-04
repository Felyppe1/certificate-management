'use server'

import { NextRequest, NextResponse } from 'next/server'
import { CreateWriteBucketSignedUrlUseCase } from '@/backend/application/create-write-bucket-signed-url-use-case'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { GcpBucket } from '@/backend/infrastructure/cloud/gcp/gcp-bucket'
import { handleError, HandleErrorResponse } from '@/utils/handle-error'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { createWriteBucketSignedUrlSchema } from '@/backend/infrastructure/server-actions/schemas'

export interface CreateSignedUrlControllerResponse {
    signedUrl: string
}

export async function POST(
    request: NextRequest,
): Promise<
    NextResponse<CreateSignedUrlControllerResponse | HandleErrorResponse>
> {
    try {
        const { userId } = await validateSessionToken()

        const body = await request.json()
        const parsed = createWriteBucketSignedUrlSchema.parse(body)

        const bucket = new GcpBucket()
        const certificatesRepository = new PrismaCertificatesRepository(prisma)

        const createWriteBucketSignedUrlUseCase =
            new CreateWriteBucketSignedUrlUseCase(
                bucket,
                certificatesRepository,
            )

        const signedUrl = await createWriteBucketSignedUrlUseCase.execute({
            certificateId: parsed.certificateId,
            fileName: parsed.fileName,
            mimeType: parsed.mimeType,
            type: parsed.type,
            userId,
        })

        return NextResponse.json({ signedUrl }, { status: 200 })
    } catch (error: unknown) {
        return await handleError(error)
    }
}
