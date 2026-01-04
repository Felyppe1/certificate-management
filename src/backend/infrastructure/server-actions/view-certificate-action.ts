'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { logoutAction } from './logout-action'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { ViewCertificateUseCase } from '@/backend/application/view-certificate-use-case'
import { validateSessionToken } from '@/utils/middleware/validateSessionToken'
import { viewCertificateSchema } from './schemas'

export async function viewCertificateAction(_: unknown, formData: FormData) {
    const rawData = {
        certificateEmissionId: formData.get('certificateEmissionId') as string,
        certificateIndex: formData.get('certificateIndex'),
    }
    try {
        const { userId } = await validateSessionToken()

        const parsedData = viewCertificateSchema.parse(rawData)

        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const bucket = new GcpBucket()

        const viewCertificateUseCase = new ViewCertificateUseCase(
            bucket,
            certificatesRepository,
            dataSetsRepository,
        )

        const signedUrl = await viewCertificateUseCase.execute({
            certificateEmissionId: parsedData.certificateEmissionId,
            userId,
            certificateIndex: parsedData.certificateIndex,
        })

        return {
            success: true,
            data: signedUrl,
        }
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
