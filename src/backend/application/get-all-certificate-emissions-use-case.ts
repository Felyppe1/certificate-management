import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'
import {
    CertificateEmissionSortCriteria,
    ICertificateEmissionsReadRepository,
} from './interfaces/repository/read/icertificate-emissions-read-repository'

interface GetAllCertificateEmissionsUseCaseInput {
    userId: string
    search?: string
    sort?: CertificateEmissionSortCriteria
    statuses?: CERTIFICATE_STATUS[]
}

export class GetAllCertificateEmissionsUseCase {
    constructor(
        private readonly certificateEmissionsReadRepository: Pick<
            ICertificateEmissionsReadRepository,
            'listByOwner'
        >,
    ) {}

    async execute({
        userId,
        search,
        sort,
        statuses,
    }: GetAllCertificateEmissionsUseCaseInput) {
        return this.certificateEmissionsReadRepository.listByOwner(
            userId,
            search,
            sort,
            statuses,
        )
    }
}
