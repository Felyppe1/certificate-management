import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { TemplateNotFoundError } from '../domain/error/not-found-error/template-not-found-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { NoDataSourceRowsError } from '../domain/error/validation-error/no-data-source-rows-error'
import { DataSourceRowsNotReadyError } from '../domain/error/validation-error/data-source-rows-not-ready-error'
import { InsufficientCreditsError } from '../domain/error/validation-error/insufficient-credits-error'
import { IQueue } from './interfaces/cloud/iqueue'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { IBucket } from './interfaces/cloud/ibucket'
import { IDataSourceRowsReadRepository } from './interfaces/repository/idata-source-rows-read-repository'
import { PROCESSING_STATUS_ENUM } from '../domain/data-source-row'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { env } from '@/env'

interface GenerateCertificatesUseCaseInput {
    certificateEmissionId: string
    userId: string
}

export class GenerateCertificatesUseCase {
    constructor(
        private bucket: Pick<IBucket, 'deleteObjectsWithPrefix'>,
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById'
        >,
        private usersRepository: Pick<IUsersRepository, 'deductCredits'>,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'updateManyProcessingStatus'
        >,
        private dataSourceRowsReadRepository: Pick<
            IDataSourceRowsReadRepository,
            | 'getManyByCertificateEmissionId'
            | 'countByCertificateEmissionId'
            | 'countWithStatuses'
        >,
        private queue: Pick<IQueue, 'enqueueGenerateCertificatePDF'>,
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

        const totalRows =
            await this.dataSourceRowsReadRepository.countByCertificateEmissionId(
                certificateEmissionId,
            )

        if (totalRows === 0) {
            throw new NoDataSourceRowsError()
        }

        const totalPendingRows =
            await this.dataSourceRowsReadRepository.countWithStatuses(
                certificateEmissionId,
                [PROCESSING_STATUS_ENUM.PENDING],
            )

        if (totalPendingRows !== totalRows) {
            throw new DataSourceRowsNotReadyError()
        }

        const credited = await this.usersRepository.deductCredits(
            userId,
            totalRows,
        )

        if (!credited) {
            throw new InsufficientCreditsError()
        }

        // Delete old certificates before generating new ones
        await this.bucket.deleteObjectsWithPrefix({
            bucketName: env.CERTIFICATES_BUCKET,
            prefix: `users/${userId}/certificates/${certificateEmissionId}/certificate`,
        })

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

            console.log('Jobs successfully enqueued:', successfulIds.length)

            await this.dataSourceRowsRepository.updateManyProcessingStatus(
                data.map(row => row.id),
                PROCESSING_STATUS_ENUM.RUNNING,
            )

            cursor = nextCursor ?? undefined
        } while (cursor)
    }
}
