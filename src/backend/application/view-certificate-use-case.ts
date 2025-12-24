import { IBucket } from './interfaces/ibucket'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import { IDataSetsRepository } from './interfaces/idata-sets-repository'
import { GENERATION_STATUS } from '../domain/data-set'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'

interface ViewCertificateUseCaseInput {
    sessionToken: string
    certificateEmissionId: string
    certificateIndex: number
}

export class ViewCertificateUseCase {
    constructor(
        private bucket: Pick<IBucket, 'generateSignedUrl'>,
        private certificateRepository: Pick<ICertificatesRepository, 'getById'>,
        private sessionsRepository: Pick<ISessionsRepository, 'getById'>,
        private dataSetsRepository: Pick<
            IDataSetsRepository,
            'getByCertificateEmissionId'
        >,
    ) {}

    async execute(input: ViewCertificateUseCaseInput) {
        const session = await this.sessionsRepository.getById(
            input.sessionToken,
        )

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        const certificate = await this.certificateRepository.getById(
            input.certificateEmissionId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.getUserId() !== session.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        const dataSet =
            await this.dataSetsRepository.getByCertificateEmissionId(
                input.certificateEmissionId,
            )

        if (!dataSet) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SET)
        }

        if (dataSet.getGenerationStatus() !== GENERATION_STATUS.COMPLETED) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.CERTIFICATES_NOT_GENERATED,
            )
        }

        const bucketName = process.env.CERTIFICATES_BUCKET!

        const filePath = `users/${session.userId}/certificates/${certificate.getId()}/certificate-${input.certificateIndex}.pdf`

        const signedUrl = await this.bucket.generateSignedUrl({
            bucketName,
            filePath,
            action: 'read',
        })

        return signedUrl
    }
}
