import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { TemplateNotFoundError } from '../domain/error/not-found-error/template-not-found-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { NoFailedDataSourceRowsError } from '../domain/error/validation-error/no-failed-data-source-rows-error'
import { IQueue } from './interfaces/messaging/iqueue'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import { IDataSourceRowsReadRepository } from './interfaces/repository/read/idata-source-rows-read-repository'
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

        if (!certificateEmission.hasDataSource()) {
            throw new DataSourceNotFoundError()
        }

        const totalFailedRows =
            await this.dataSourceRowsReadRepository.countWithStatuses(
                certificateEmissionId,
                [PROCESSING_STATUS_ENUM.FAILED],
            )

        if (totalFailedRows === 0) {
            throw new NoFailedDataSourceRowsError()
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
                            fileMimeType: template!.fileMimeType,
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
