import { ForbiddenError } from '../domain/error/forbidden-error'
import { NotFoundError } from '../domain/error/not-found-error'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { ISessionsRepository } from './interfaces/isessions-repository'

interface UpdateCertificateEmissionUseCaseInput {
    sessionToken: string
    id: string
    name?: string
    variableColumnMapping?: Record<string, string | null> | null
}

export class UpdateCertificateEmissionUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private sessionsRepository: Pick<ISessionsRepository, 'getById'>,
    ) {}

    async execute(data: UpdateCertificateEmissionUseCaseInput) {
        const session = await this.sessionsRepository.getById(data.sessionToken)

        if (!session) {
            throw new NotFoundError('Session not found')
        }

        const certificate = await this.certificateEmissionsRepository.getById(
            data.id,
        )

        if (!certificate) {
            throw new NotFoundError('Certificate not found')
        }

        if (certificate.getUserId() !== session.userId) {
            throw new ForbiddenError(
                'User is not allowed to update this certificate',
            )
        }

        certificate.update({
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.variableColumnMapping !== undefined
                ? { variableColumnMapping: data.variableColumnMapping }
                : {}),
        })

        await this.certificateEmissionsRepository.update(certificate)
    }
}
