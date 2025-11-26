import { AuthenticationError } from '../domain/error/authentication-error'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { ISessionsRepository } from './interfaces/isessions-repository'

interface GetCertificateEmissionsMetricsUseCaseInput {
    sessionToken: string
    // userId: string
}

export class GetCertificateEmissionsMetricsUseCase {
    constructor(
        private sessionsRepository: ISessionsRepository,
        private certificateEmissionsRepository: ICertificatesRepository,
    ) {}

    async execute({
        sessionToken,
    }: GetCertificateEmissionsMetricsUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        const certificateEmissionsMetrics =
            await this.certificateEmissionsRepository.getCertificateEmissionsMetricsByUserId(
                session.userId,
            )

        console.log(certificateEmissionsMetrics)

        return certificateEmissionsMetrics
    }
}
