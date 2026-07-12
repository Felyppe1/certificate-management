import { ICertificateEmissionsReadRepository } from './interfaces/repository/read/icertificate-emissions-read-repository'

interface GetAllCertificateEmissionsUseCaseInput {
    userId: string
}

export class GetAllCertificateEmissionsUseCase {
    constructor(
        private readonly certificateEmissionsReadRepository: Pick<
            ICertificateEmissionsReadRepository,
            'listByOwner'
        >,
    ) {}

    async execute({ userId }: GetAllCertificateEmissionsUseCaseInput) {
        return this.certificateEmissionsReadRepository.listByOwner(userId)
    }
}
