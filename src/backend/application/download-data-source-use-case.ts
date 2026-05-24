import { env } from '@/env'
import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'

interface DownloadDataSourceUseCaseInput {
    userId: string
    certificateEmissionId: string
    fileIndex: number
}

export class DownloadDataSourceUseCase {
    constructor(
        private bucket: Pick<IBucket, 'generateSignedUrl'>,
        private certificateRepository: Pick<ICertificatesRepository, 'getById'>,
    ) {}

    async execute(input: DownloadDataSourceUseCaseInput) {
        const certificateEmission = await this.certificateRepository.getById(
            input.certificateEmissionId,
        )

        if (!certificateEmission) {
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new NotCertificateOwnerError()
        }

        const dataSourceStorageFileUrl =
            certificateEmission.getDataSourceStorageFileUrl(input.fileIndex)

        if (!dataSourceStorageFileUrl) {
            throw new DataSourceNotFoundError()
        }

        const bucketName = env.CERTIFICATES_BUCKET

        const signedUrl = await this.bucket.generateSignedUrl({
            bucketName,
            filePath: dataSourceStorageFileUrl,
            action: 'read',
        })

        return signedUrl
    }
}
