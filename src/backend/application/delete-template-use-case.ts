import { env } from '@/env'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { TemplateNotFoundError } from '../domain/error/not-found-error/template-not-found-error'
import { IBucket } from './interfaces/storage/ibucket'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'

interface DeleteTemplateUseCaseInput {
    certificateId: string
    userId: string
}

export class DeleteTemplateUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        >,
        private bucket: Pick<IBucket, 'deleteObject'>,
        private transactionManager: Pick<ITransactionManager, 'run'>,
    ) {}

    async execute({ certificateId, userId }: DeleteTemplateUseCaseInput) {
        const certificateEmission =
            await this.certificateEmissionsRepository.getById(certificateId)

        if (!certificateEmission) {
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(userId)) {
            throw new NotCertificateOwnerError()
        }

        if (certificateEmission.isEmitted()) {
            throw new CertificateEmittedError()
        }

        if (!certificateEmission.hasTemplate()) {
            throw new TemplateNotFoundError()
        }

        const storageFileUrl = certificateEmission.getTemplateStorageFileUrl()

        certificateEmission.removeTemplate(userId)

        await this.transactionManager.run(async () => {
            if (certificateEmission.hasDataSource()) {
                await this.dataSourceRowsRepository.resetProcessingStatusByCertificateEmissionId(
                    certificateEmission.getId(),
                )
            }

            await this.certificateEmissionsRepository.update(
                certificateEmission,
            )
        })

        await this.bucket.deleteObject({
            bucketName: env.CERTIFICATES_BUCKET,
            objectName: storageFileUrl,
        })
    }
}
