import { env } from '@/env'
import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { DataSourceRowNotFoundError } from '../domain/error/not-found-error/data-source-row-not-found-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { PROCESSING_STATUS_ENUM } from '../domain/data-source-row'
import { CertificateNotGeneratedError } from '../domain/error/validation-error/certificate-not-generated-error'

interface DownloadCertificateEmissionUseCaseInput {
    userId: string
    rowId: string
}

export class DownloadCertificateEmissionUseCase {
    constructor(
        private bucket: Pick<IBucket, 'generateSignedUrl'>,
        private certificateRepository: Pick<ICertificatesRepository, 'getById'>,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'getById'
        >,
    ) {}

    async execute(input: DownloadCertificateEmissionUseCaseInput) {
        const row = await this.dataSourceRowsRepository.getById(input.rowId)

        if (!row) {
            throw new DataSourceRowNotFoundError()
        }

        const certificateEmission = await this.certificateRepository.getById(
            row.getCertificateEmissionId(),
        )

        if (!certificateEmission) {
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new NotCertificateOwnerError()
        }

        if (row.getProcessingStatus() !== PROCESSING_STATUS_ENUM.COMPLETED) {
            throw new CertificateNotGeneratedError()
        }

        const bucketName = env.CERTIFICATES_BUCKET

        const filePath = `users/${input.userId}/certificates/${certificateEmission.getId()}/certificate-${input.rowId}.pdf`

        const signedUrl = await this.bucket.generateSignedUrl({
            bucketName,
            filePath,
            action: 'read',
        })

        return signedUrl
    }
}
