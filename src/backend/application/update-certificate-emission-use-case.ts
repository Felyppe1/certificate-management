import { AuthenticationError } from '../domain/error/authentication-error'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
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
            throw new AuthenticationError('session-not-found')
        }

        const certificate = await this.certificateEmissionsRepository.getById(
            data.id,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.getUserId() !== session.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
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
