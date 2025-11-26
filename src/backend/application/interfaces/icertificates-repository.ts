import { Certificate } from '@/backend/domain/certificate'

interface GetCertificateEmissionsMetricsByUserIdOutput {
    totalCertificatesGenerated: number
    totalEmailsSent: number
    totalCertificatesGeneratedThisMonth: number
    totalEmailsSentThisMonth: number
    totalCertificatesGeneratedLastMonth: number
    totalEmailsSentLastMonth: number
}

export interface ICertificatesRepository {
    save(certificate: Certificate): Promise<void>
    update(certificate: Certificate): Promise<void>
    getById(id: string): Promise<Certificate | null>
    getCertificateEmissionsMetricsByUserId(
        userId: string,
    ): Promise<GetCertificateEmissionsMetricsByUserIdOutput>
}
