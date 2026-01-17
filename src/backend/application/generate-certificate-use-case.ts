import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IPubSub } from './interfaces/cloud/ipubsub'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'

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
        private pubSub: Pick<IPubSub, 'publish'>,
    ) {}

    async execute({ rowId, userId }: RetryDataSourceRowUseCaseInput) {
        const row = await this.dataSourceRowsRepository.getById(rowId)

        if (!row) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        const certificateEmission =
            await this.certificateEmissionsRepository.getById(
                row.getCertificateEmissionId(),
            )

        if (!certificateEmission) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificateEmission.getUserId() !== userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        const { dataSource, template, ...certificateEmissionData } =
            certificateEmission.serialize()
        const rowData = row.serialize()

        await this.pubSub.publish('certificates-generation-started', {
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
            row: { id: rowData.id, data: rowData.data },
        })

        row.startGeneration()

        await this.dataSourceRowsRepository.update(row)
    }
}
