import { AuthenticationError } from '../domain/error/authentication-error'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { ISessionsRepository } from './interfaces/repository/isessions-repository'

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

        return certificateEmissionsMetrics
    }
}
