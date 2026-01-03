'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { prisma } from '../repository/prisma'
import { CreateWriteBucketSignedUrlUseCase } from '@/backend/application/create-write-bucket-signed-url-use-case'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { logoutAction } from './logout-action'
import { createWriteBucketSignedUrlSchema } from './schemas/certificate-emission-schemas'

export async function createWriteBucketSignedUrlAction(
    _: unknown,
    formData: FormData,
) {
    const rawData = {
        certificateId: formData.get('certificateId') as string,
        fileName: formData.get('fileName') as string,
        mimeType: formData.get('mimeType') as string,
        type: formData.get('type') as 'TEMPLATE',
    }

    try {
        const { userId } = await validateSessionToken()

        const parsedData = createWriteBucketSignedUrlSchema.parse(rawData)

        const bucket = new GcpBucket()
        const certificatesRepository = new PrismaCertificatesRepository(prisma)

        const createWriteBucketSignedUrlUseCase =
            new CreateWriteBucketSignedUrlUseCase(
                bucket,
                certificatesRepository,
            )

        const signedUrl = await createWriteBucketSignedUrlUseCase.execute({
            userId,
            certificateId: parsedData.certificateId,
            fileName: parsedData.fileName,
            mimeType: parsedData.mimeType,
            type: parsedData.type,
        })

        return signedUrl
    } catch (error: any) {
        console.error(error)

        if (error instanceof AuthenticationError) {
            if (
                error.type === 'missing-session' ||
                error.type === 'session-not-found' ||
                error.type === 'user-not-found'
            ) {
                await logoutAction()
            }
        }

        return {
            success: false,
            errorType: error.type,
        }
    }
}
