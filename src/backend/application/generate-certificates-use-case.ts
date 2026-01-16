import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSetsRepository } from './interfaces/repository/idata-sets-repository'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { IExternalUserAccountsRepository } from './interfaces/repository/iexternal-user-accounts-repository'
import { IPubSub } from './interfaces/cloud/ipubsub'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { IBucket } from './interfaces/cloud/ibucket'

interface GenerateCertificatesUseCaseInput {
    certificateEmissionId: string
    userId: string
}

export class GenerateCertificatesUseCase {
    constructor(
        private bucket: Pick<IBucket, 'deleteObjectsWithPrefix'>,
        private externalUserAccountsRepository: Pick<
            IExternalUserAccountsRepository,
            'getById'
        >,
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById'
        >,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'getManyByCertificateEmissionId' | 'updateMany'
        >,
        private dataSetsRepository: Pick<
            IDataSetsRepository,
            'getByCertificateEmissionId' | 'upsert'
        >,
        private pubSub: Pick<IPubSub, 'publish'>,
    ) {}

    async execute({
        certificateEmissionId,
        userId,
    }: GenerateCertificatesUseCaseInput) {
        const certificateEmission =
            await this.certificateEmissionsRepository.getById(
                certificateEmissionId,
            )

        if (!certificateEmission) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificateEmission.getUserId() !== userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (!certificateEmission.hasTemplate()) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.TEMPLATE)
        }

        if (!certificateEmission.hasDataSource()) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        const dataSourceRows =
            await this.dataSourceRowsRepository.getManyByCertificateEmissionId(
                certificateEmission.getId(),
            )

        if (dataSourceRows.length === 0) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.NO_DATA_SOURCE_ROWS)
        }

        const externalUserAccount =
            await this.externalUserAccountsRepository.getById(userId, 'GOOGLE')

        // Delete old certificates before generating new ones
        await this.bucket.deleteObjectsWithPrefix({
            bucketName: process.env.CERTIFICATES_BUCKET!,
            prefix: `users/${userId}/certificates/${certificateEmissionId}/certificate`,
        })

        const { dataSource, template, ...certificateEmissionData } =
            certificateEmission.serialize()

        const publishPromises = dataSourceRows.map(dataSourceRow => {
            const { id, data } = dataSourceRow.serialize()

            const body = {
                certificateEmission: {
                    ...certificateEmissionData,
                    googleAccessToken: externalUserAccount?.accessToken || null,
                    template: template!,
                    dataSource: {
                        ...dataSource!,
                        row: {
                            id,
                            data,
                        },
                    },
                },
            }

            return this.pubSub.publish('certificates-generation-started', body)
        })

        await Promise.all(publishPromises)

        dataSourceRows.forEach(dataSourceRow => {
            dataSourceRow.startGeneration()
        })

        await this.dataSourceRowsRepository.updateMany(dataSourceRows)
        // dataSet.update({
        //     generationStatus: GENERATION_STATUS.PENDING,
        // })

        // await this.dataSetsRepository.upsert(dataSet)
    }
}
