import { ICertificateEmissionsReadRepository } from './interfaces/repository/read/icertificate-emissions-read-repository'

interface GetAllCertificateEmissionsUseCaseInput {
    userId: string
    search?: string
}

export class GetAllCertificateEmissionsUseCase {
    constructor(
        private readonly certificateEmissionsReadRepository: Pick<
            ICertificateEmissionsReadRepository,
            'listByOwner'
        >,
    ) {}

    async execute({ userId, search }: GetAllCertificateEmissionsUseCaseInput) {
        return this.certificateEmissionsReadRepository.listByOwner(
            userId,
            search,
        )
    }
}
