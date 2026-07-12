import { CertificateEmission } from '@/backend/domain/certificate'

export interface ICertificatesRepository {
    save(certificate: CertificateEmission): Promise<void>
    update(certificate: CertificateEmission): Promise<void>
    delete(id: string): Promise<void>
    getById(id: string): Promise<CertificateEmission | null>
    checkIfExistsById(id: string): Promise<boolean>
    markAsGeneratedIfNotAlready(id: string): Promise<void>
}
