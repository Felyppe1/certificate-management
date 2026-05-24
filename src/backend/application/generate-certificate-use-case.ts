import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IQueue } from './interfaces/cloud/iqueue'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'

interface RetryDataSourceRowUseCaseInput {
    rowId: string
    userId: string
}

export class RetryDataSourceRowUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById'
        >,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'getById' | 'update'
        >,
        private queue: Pick<IQueue, 'enqueueGenerateCertificatePDF'>,
    ) {}

    async execute({ rowId, userId }: RetryDataSourceRowUseCaseInput) {
        const row = await this.dataSourceRowsRepository.getById(rowId)

        if (!row) {
            throw new DataSourceNotFoundError()
        }

        const certificateEmission =
            await this.certificateEmissionsRepository.getById(
                row.getCertificateEmissionId(),
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

        const { dataSource, template, ...certificateEmissionData } =
            certificateEmission.serialize()
        const rowData = row.serialize()

        await this.queue.enqueueGenerateCertificatePDF({
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
            row: {
                id: rowData.id,
                data: rowData.data as Record<string, string>,
            },
        })

        row.startGeneration()

        await this.dataSourceRowsRepository.update(row)
    }
}
