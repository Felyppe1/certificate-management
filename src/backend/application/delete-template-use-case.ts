import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSetsRepository } from './interfaces/repository/idata-sets-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'

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
        private dataSetsRepository: Pick<
            IDataSetsRepository,
            'getByCertificateEmissionId' | 'upsert'
        >,
        private bucket: Pick<IBucket, 'deleteObject'>,
        private transactionManager: ITransactionManager,
    ) {}

    async execute({ certificateId, userId }: DeleteTemplateUseCaseInput) {
        const certificate =
            await this.certificateEmissionsRepository.getById(certificateId)

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        const storageFileUrl = certificate.getTemplateStorageFileUrl()

        certificate.removeTemplate(userId)

        const dataSet =
            await this.dataSetsRepository.getByCertificateEmissionId(
                certificate.getId(),
            )

        await this.transactionManager.run(async () => {
            if (dataSet) {
                dataSet.update({
                    generationStatus: null,
                })

                await this.dataSetsRepository.upsert(dataSet)
            }

            await this.certificateEmissionsRepository.update(certificate)
        })

        if (storageFileUrl) {
            // TODO: do this on outbox pattern?
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: storageFileUrl,
            })
        }
    }
}
