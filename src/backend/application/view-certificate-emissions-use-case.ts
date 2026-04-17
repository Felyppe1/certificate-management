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
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { env } from '@/env'

interface ViewCertificateEmissionsUseCaseInput {
    userId: string
    rowIds: string[]
}

export class ViewCertificateEmissionsUseCase {
    constructor(
        private bucket: Pick<IBucket, 'generateSignedUrl'>,
        private certificateRepository: Pick<ICertificatesRepository, 'getById'>,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'getByIds'
        >,
    ) {}

    async execute(
        input: ViewCertificateEmissionsUseCaseInput,
    ): Promise<{ rowId: string; signedUrl: string }[]> {
        const dataSourceRows = await this.dataSourceRowsRepository.getByIds(
            input.rowIds,
        )

        if (dataSourceRows.length === 0) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE_ROW)
        }

        // All rows belong to the same certificate emission — validate once
        const certificateEmissionId =
            dataSourceRows[0].getCertificateEmissionId()

        const certificateEmission = await this.certificateRepository.getById(
            certificateEmissionId,
        )

        if (!certificateEmission) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        const bucketName = env.CERTIFICATES_BUCKET

        const results = await Promise.all(
            dataSourceRows.map(async row => {
                const filePath = `users/${input.userId}/certificates/${certificateEmission.getId()}/certificate-${row.getId()}.pdf`

                const signedUrl = await this.bucket.generateSignedUrl({
                    bucketName,
                    filePath,
                    action: 'read',
                })

                return { rowId: row.getId(), signedUrl }
            }),
        )

        return results
    }
}
