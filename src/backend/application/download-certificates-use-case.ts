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

import archiver from 'archiver' // TODO: dependency inversion
import { PassThrough } from 'stream'

interface DownloadCertificateUseCaseInput {
    sessionToken: string
    certificateEmissionId: string
}

export class DownloadCertificatesUseCase {
    constructor(
        private bucket: Pick<IBucket, 'getObjectsWithPrefix'>,
        private certificateRepository: Pick<ICertificatesRepository, 'getById'>,
        private sessionsRepository: Pick<ISessionsRepository, 'getById'>,
        private dataSetsRepository: Pick<
            IDataSetsRepository,
            'getByCertificateEmissionId'
        >,
    ) {}

    async execute(input: DownloadCertificateUseCaseInput) {
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

        const prefix = `users/${session.userId}/certificates/${certificate.getId()}/certificate`

        const certificateObjects = await this.bucket.getObjectsWithPrefix({
            bucketName,
            prefix,
        })

        const archive = archiver('zip')
        const stream = new PassThrough()

        archive.pipe(stream)

        for (const file of certificateObjects) {
            const fileName = file.name.split('/').pop()!
            archive.append(file.createReadStream(), { name: fileName })
        }

        await archive.finalize()
        return stream
    }
}
