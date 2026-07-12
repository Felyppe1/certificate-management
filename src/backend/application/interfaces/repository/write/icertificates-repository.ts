import { CertificateEmission } from '@/backend/domain/certificate'

interface GetCertificateEmissionsMetricsByUserIdOutput {
    totalCertificatesGenerated: number
    totalEmailsSent: number
    dailyCertificates: { date: Date; quantity: number }[]
    dailyEmails: { date: Date; quantity: number }[]
}

export interface ICertificatesRepository {
    save(certificate: CertificateEmission): Promise<void>
    update(certificate: CertificateEmission): Promise<void>
    delete(id: string): Promise<void>
    getById(id: string): Promise<CertificateEmission | null>
    checkIfExistsById(id: string): Promise<boolean>
    markAsGeneratedIfNotAlready(id: string): Promise<void>
    getCertificateEmissionsMetricsByUserId(
        userId: string,
    ): Promise<GetCertificateEmissionsMetricsByUserIdOutput>
}
