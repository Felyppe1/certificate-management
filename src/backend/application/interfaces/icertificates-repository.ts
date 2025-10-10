import { Certificate } from '@/backend/domain/certificate'

export interface ICertificatesRepository {
    save(certificate: Certificate): Promise<void>
    update(certificate: Certificate): Promise<void>
    getById(id: string): Promise<Certificate | null>
}
