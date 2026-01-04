import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'

interface GetCertificateEmissionsMetricsUseCaseInput {
    userId: string
}

export class GetCertificateEmissionsMetricsUseCase {
    constructor(
        private certificateEmissionsRepository: ICertificatesRepository,
    ) {}

    async execute({ userId }: GetCertificateEmissionsMetricsUseCaseInput) {
        const certificateEmissionsMetrics =
            await this.certificateEmissionsRepository.getCertificateEmissionsMetricsByUserId(
                userId,
            )

        return certificateEmissionsMetrics
    }
}
