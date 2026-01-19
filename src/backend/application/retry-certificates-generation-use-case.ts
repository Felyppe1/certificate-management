import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { IQueue } from './interfaces/cloud/iqueue'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { IDataSourceRowsReadRepository } from './interfaces/repository/idata-source-rows-read-repository'
import { PROCESSING_STATUS_ENUM } from '../domain/data-source-row'

interface RetryCertificatesGenerationUseCaseInput {
    certificateEmissionId: string
    userId: string
}

export class RetryCertificatesGenerationUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById'
        >,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'updateManyProcessingStatus'
        >,
        private dataSourceRowsReadRepository: Pick<
            IDataSourceRowsReadRepository,
            'getManyByCertificateEmissionId' | 'countWithStatuses'
        >,
        private queue: Pick<IQueue, 'enqueueGenerateCertificatePDF'>,
    ) {}

    async execute({
        certificateEmissionId,
        userId,
    }: RetryCertificatesGenerationUseCaseInput) {
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

        const totalFailedRows =
            await this.dataSourceRowsReadRepository.countWithStatuses(
                certificateEmissionId,
                [PROCESSING_STATUS_ENUM.FAILED],
            )

        if (totalFailedRows === 0) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.NO_FAILED_DATA_SOURCE_ROWS,
            )
        }

        const { dataSource, template, ...certificateEmissionData } =
            certificateEmission.serialize()

        const PAGE_SIZE = 100
        let cursor: string | undefined = undefined

        do {
            const { data, nextCursor } =
                await this.dataSourceRowsReadRepository.getManyByCertificateEmissionId(
                    certificateEmissionId,
                    PAGE_SIZE,
                    cursor,
                    [PROCESSING_STATUS_ENUM.FAILED],
                )

            if (data.length === 0) break

            const enqueuePromises = data.map(({ id, data }) => {
                return this.queue.enqueueGenerateCertificatePDF({
                    certificateEmission: {
                        id: certificateEmissionData.id,
                        userId: certificateEmissionData.userId,
                        variableColumnMapping:
                            certificateEmissionData.variableColumnMapping,
                        template: {
                            storageFileUrl: template!.storageFileUrl,
                            fileExtension: template!.fileExtension,
                            variables: template!.variables,
                        },
                        dataSource: {
                            columns: dataSource!.columns,
                        },
                    },
                    row: { id, data },
                })
            })

            const results = await Promise.allSettled(enqueuePromises)

            const successfulIds = results.filter(
                result => result.status === 'fulfilled',
            )

            console.log('Retries successfully enqueued:', successfulIds.length)

            await this.dataSourceRowsRepository.updateManyProcessingStatus(
                data.map(row => row.id),
                PROCESSING_STATUS_ENUM.RETRYING,
            )

            cursor = nextCursor ?? undefined
        } while (cursor)

        return {
            totalRetrying: totalFailedRows,
        }
    }
}
