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

        const archive = archiver('zip', {
            // zlib: { level: 9 } // Optional: define compression level
        })

        const stream = new PassThrough()

        // Connect the archiver to the output stream
        archive.pipe(stream)

        // IMPORTANT: Do not use await here in the main flow.
        // We create an async function to process the filling without blocking the return.
        const processArchive = async () => {
            try {
                for (const file of certificateObjects) {
                    const fileName = file.name.split('/').pop()!
                    // The append only queues the stream, the archiver manages the reading
                    archive.append(file.createReadStream(), { name: fileName })
                }

                // Finalize the archive when everything is queued
                await archive.finalize()
            } catch (error) {
                // If an error occurs during download/zip, destroy the stream to notify the client that the download failed
                stream.destroy(error as Error)
            }
        }

        // Launch the process in the "background" and let Node manage it
        processArchive()

        // Return the stream IMMEDIATELY to the controller
        return stream

        // const archive = archiver('zip')
        // const stream = new PassThrough()

        // archive.pipe(stream)

        // for (const file of certificateObjects) {
        //     const fileName = file.name.split('/').pop()!
        //     archive.append(file.createReadStream(), { name: fileName })
        // }

        // await archive.finalize()
        // return stream
    }
}
