import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'

import archiver from 'archiver' // TODO: dependency inversion
import { PassThrough } from 'stream'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'

interface DownloadCertificateUseCaseInput {
    userId: string
    certificateEmissionId: string
}

export class DownloadCertificatesUseCase {
    constructor(
        private bucket: Pick<IBucket, 'getObjectsWithPrefix'>,
        private certificateRepository: Pick<ICertificatesRepository, 'getById'>,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'allRowsFinishedProcessing'
        >,
    ) {}

    async execute(input: DownloadCertificateUseCaseInput) {
        const certificate = await this.certificateRepository.getById(
            input.certificateEmissionId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.getUserId() !== input.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        const allRowsFinishedProcessing =
            await this.dataSourceRowsRepository.allRowsFinishedProcessing(
                input.certificateEmissionId,
            )

        if (!allRowsFinishedProcessing) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.CERTIFICATES_NOT_GENERATED,
            )
        }

        const bucketName = process.env.CERTIFICATES_BUCKET!

        const prefix = `users/${input.userId}/certificates/${certificate.getId()}/certificate`

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
