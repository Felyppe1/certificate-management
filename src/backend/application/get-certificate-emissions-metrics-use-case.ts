import { ICertificateEmissionsReadRepository } from './interfaces/repository/read/icertificate-emissions-read-repository'

interface GetCertificateEmissionsMetricsUseCaseInput {
    userId: string
}

export class GetCertificateEmissionsMetricsUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificateEmissionsReadRepository,
            'getCertificateEmissionsMetricsByUserId'
        >,
    ) {}

    async execute({ userId }: GetCertificateEmissionsMetricsUseCaseInput) {
        const certificateEmissionsMetrics =
            await this.certificateEmissionsRepository.getCertificateEmissionsMetricsByUserId(
                userId,
            )

        return certificateEmissionsMetrics
    }
}
