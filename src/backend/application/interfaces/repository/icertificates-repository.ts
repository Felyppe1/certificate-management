import { CertificateEmission } from '@/backend/domain/certificate'

interface GetCertificateEmissionsMetricsByUserIdOutput {
    totalCertificatesGenerated: number
    totalEmailsSent: number
    totalCertificatesGeneratedThisMonth: number
    totalEmailsSentThisMonth: number
    totalCertificatesGeneratedLastMonth: number
    totalEmailsSentLastMonth: number
}

export interface ICertificatesRepository {
    save(certificate: CertificateEmission): Promise<void>
    update(certificate: CertificateEmission): Promise<void>
    getById(id: string): Promise<CertificateEmission | null>
    getCertificateEmissionsMetricsByUserId(
        userId: string,
    ): Promise<GetCertificateEmissionsMetricsByUserIdOutput>
}
