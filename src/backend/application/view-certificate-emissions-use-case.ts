import { IBucket } from './interfaces/storage/ibucket'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { DataSourceRowNotFoundError } from '../domain/error/not-found-error/data-source-row-not-found-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import { TEMPLATE_MIME_TYPE_TO_FILE_EXTENSION } from '../domain/template'
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
    ): Promise<
        { rowId: string; signedUrl: string; sourceSignedUrl: string | null }[]
    > {
        const dataSourceRows = await this.dataSourceRowsRepository.getByIds(
            input.rowIds,
        )

        if (dataSourceRows.length === 0) {
            throw new DataSourceRowNotFoundError()
        }

        // All rows belong to the same certificate emission — validate once
        const certificateEmissionId =
            dataSourceRows[0].getCertificateEmissionId()

        const certificateEmission = await this.certificateRepository.getById(
            certificateEmissionId,
        )

        if (!certificateEmission) {
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new NotCertificateOwnerError()
        }

        const bucketName = env.CERTIFICATES_BUCKET

        const sourceExt =
            TEMPLATE_MIME_TYPE_TO_FILE_EXTENSION[
                certificateEmission.getTemplateFileMimeType() ?? ''
            ] ?? null

        const results = await Promise.all(
            dataSourceRows.map(async row => {
                const base = `users/${input.userId}/certificates/${certificateEmission.getId()}/certificate-${row.getId()}`

                const signedUrl = await this.bucket.generateSignedUrl({
                    bucketName,
                    filePath: `${base}.pdf`,
                    action: 'read',
                })

                const sourceSignedUrl = sourceExt
                    ? await this.bucket.generateSignedUrl({
                          bucketName,
                          filePath: `${base}.${sourceExt}`,
                          action: 'read',
                      })
                    : null

                return { rowId: row.getId(), signedUrl, sourceSignedUrl }
            }),
        )

        return results
    }
}
