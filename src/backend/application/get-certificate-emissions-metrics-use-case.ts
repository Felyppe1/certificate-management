import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'

interface GetCertificateEmissionsMetricsUseCaseInput {
    userId: string
}

export class GetCertificateEmissionsMetricsUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
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
