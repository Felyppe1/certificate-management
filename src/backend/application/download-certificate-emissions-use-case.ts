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

import archiver from 'archiver' // TODO: dependency inversion
import { PassThrough } from 'stream'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { env } from '@/env'

interface DownloadCertificateEmissionsUseCaseInput {
    userId: string
    certificateEmissionId: string
    rowIds: string[]
}

export class DownloadCertificateEmissionsUseCase {
    constructor(
        private bucket: Pick<IBucket, 'getObjectsWithPrefix'>,
        private certificateRepository: Pick<ICertificatesRepository, 'getById'>,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'getById'
        >,
    ) {}

    async execute(input: DownloadCertificateEmissionsUseCaseInput) {
        const certificateEmission = await this.certificateRepository.getById(
            input.certificateEmissionId,
        )

        if (!certificateEmission) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        // Build the list of specific file paths for the selected rows
        const filePaths = input.rowIds.map(
            rowId =>
                `users/${input.userId}/certificates/${certificateEmission.getId()}/certificate-${rowId}.pdf`,
        )

        const bucketName = env.CERTIFICATES_BUCKET

        // Fetch all objects that match each specific file path by using their exact prefix
        const fileObjects = (
            await Promise.all(
                filePaths.map(filePath =>
                    this.bucket.getObjectsWithPrefix({
                        bucketName,
                        prefix: filePath,
                    }),
                ),
            )
        ).flat()

        const archive = archiver('zip')
        const stream = new PassThrough()

        archive.pipe(stream)

        const processArchive = async () => {
            try {
                for (const file of fileObjects) {
                    const fileName = file.name.split('/').pop()!
                    archive.append(file.createReadStream(), { name: fileName })
                }
                await archive.finalize()
            } catch (error) {
                stream.destroy(error as Error)
            }
        }

        processArchive()

        return stream
    }
}
