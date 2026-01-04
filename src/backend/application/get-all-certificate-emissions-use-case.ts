import { CERTIFICATE_STATUS } from '../domain/certificate'
import { prisma } from '../infrastructure/repository/prisma'

interface GetAllCertificateEmissionsUseCaseInput {
    userId: string
}

export class GetAllCertificateEmissionsUseCase {
    async execute({ userId }: GetAllCertificateEmissionsUseCaseInput) {
        const certificateEmissions = await prisma.certificateEmission.findMany({
            where: {
                user_id: userId,
            },
            orderBy: {
                created_at: 'desc',
            },
        })

        return certificateEmissions.map(certificate => ({
            id: certificate.id,
            name: certificate.title,
            userId: certificate.user_id,
            status: certificate.status as CERTIFICATE_STATUS,
            createdAt: certificate.created_at,
        }))
    }
}
