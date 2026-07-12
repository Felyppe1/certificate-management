import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { ICertificateEmissionsReadRepository } from './interfaces/repository/read/icertificate-emissions-read-repository'

interface GetCertificateEmissionUseCaseInput {
    certificateId: string
    userId: string
}

export class GetCertificateEmissionUseCase {
    constructor(
        private readonly certificateEmissionsReadRepository: Pick<
            ICertificateEmissionsReadRepository,
            'getDetailsById'
        >,
    ) {}

    async execute({
        certificateId,
        userId,
    }: GetCertificateEmissionUseCaseInput) {
        const certificate =
            await this.certificateEmissionsReadRepository.getDetailsById(
                certificateId,
            )

        if (!certificate) {
            throw new CertificateNotFoundError()
        }

        if (certificate.userId !== userId) {
            throw new NotCertificateOwnerError()
        }

        return certificate
    }
}
