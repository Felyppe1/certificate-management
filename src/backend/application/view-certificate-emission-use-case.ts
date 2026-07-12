import { IBucket } from './interfaces/storage/ibucket'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { DataSourceRowNotFoundError } from '../domain/error/not-found-error/data-source-row-not-found-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import { env } from '@/env'

interface ViewCertificateEmissionUseCaseInput {
    userId: string
    rowId: string
}

export class ViewCertificateEmissionUseCase {
    constructor(
        private bucket: Pick<IBucket, 'generateSignedUrl'>,
        private certificateRepository: Pick<ICertificatesRepository, 'getById'>,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'getById'
        >,
    ) {}

    async execute(input: ViewCertificateEmissionUseCaseInput) {
        const dataSourceRow = await this.dataSourceRowsRepository.getById(
            input.rowId,
        )

        if (!dataSourceRow) {
            throw new DataSourceRowNotFoundError()
        }

        const certificateEmission = await this.certificateRepository.getById(
            dataSourceRow.getCertificateEmissionId(),
        )

        if (!certificateEmission) {
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new NotCertificateOwnerError()
        }
        // TODO: handle error

        const bucketName = env.CERTIFICATES_BUCKET

        const filePath = `users/${input.userId}/certificates/${certificateEmission.getId()}/certificate-${dataSourceRow.getId()}.pdf`

        const signedUrl = await this.bucket.generateSignedUrl({
            bucketName,
            filePath,
            action: 'read',
        })

        return signedUrl
    }
}
