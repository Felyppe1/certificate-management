import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'

interface FinishCertificatesGenerationUseCaseInput {
    certificateEmissionId: string
    success: boolean
    totalBytes?: number
}

export class FinishCertificatesGenerationUseCase {
    constructor(
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'getManyByCertificateEmissionId' | 'updateMany'
        >,
    ) {}

    async execute(input: FinishCertificatesGenerationUseCaseInput) {
        const dataSourceRows =
            await this.dataSourceRowsRepository.getManyByCertificateEmissionId(
                input.certificateEmissionId,
            )

        if (dataSourceRows.length === 0) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.NO_DATA_SOURCE_ROWS)
        }

        if (input.success) {
            const bytesPerRow = input.totalBytes
                ? Math.floor(input.totalBytes! / dataSourceRows.length)
                : 0

            dataSourceRows.forEach(dataSourceRow => {
                dataSourceRow.finishGenerationSuccessfully(bytesPerRow)
            })
        } else {
            dataSourceRows.forEach(dataSourceRow => {
                dataSourceRow.finishGenerationWithError()
            })
        }

        await this.dataSourceRowsRepository.updateMany(dataSourceRows)
    }
}
