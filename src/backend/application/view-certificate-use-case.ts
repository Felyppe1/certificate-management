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

interface ViewCertificateUseCaseInput {
    userId: string
    certificateEmissionId: string
    certificateIndex: number
}

export class ViewCertificateUseCase {
    constructor(
        private bucket: Pick<IBucket, 'generateSignedUrl'>,
        private certificateRepository: Pick<ICertificatesRepository, 'getById'>,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'getManyByCertificateEmissionId'
        >,
    ) {}

    async execute(input: ViewCertificateUseCaseInput) {
        const certificate = await this.certificateRepository.getById(
            input.certificateEmissionId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.getUserId() !== input.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        const dataSourceRows =
            await this.dataSourceRowsRepository.getManyByCertificateEmissionId(
                certificate.getId(),
            )

        const dataSourceRow = dataSourceRows[input.certificateIndex]

        // TODO: handle error

        const bucketName = process.env.CERTIFICATES_BUCKET!

        const filePath = `users/${input.userId}/certificates/${certificate.getId()}/certificate-${input.certificateIndex}.pdf`

        const signedUrl = await this.bucket.generateSignedUrl({
            bucketName,
            filePath,
            action: 'read',
        })

        return signedUrl
    }
}
