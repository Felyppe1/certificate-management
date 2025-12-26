import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { AuthenticationError } from '../domain/error/authentication-error'
import { IBucket } from './interfaces/ibucket'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { IDataSetsRepository } from './interfaces/idata-sets-repository'
import { ITransactionManager } from './interfaces/itransaction-manager'

interface DeleteTemplateUseCaseInput {
    certificateId: string
    sessionToken: string
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
        private sessionsRepository: Pick<ISessionsRepository, 'getById'>,
        private bucket: Pick<IBucket, 'deleteObject'>,
        private transactionManager: ITransactionManager,
    ) {}

    async execute({ certificateId, sessionToken }: DeleteTemplateUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        const certificate =
            await this.certificateEmissionsRepository.getById(certificateId)

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        const storageFileUrl = certificate.getTemplateStorageFileUrl()

        certificate.removeTemplate(session.userId)

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
