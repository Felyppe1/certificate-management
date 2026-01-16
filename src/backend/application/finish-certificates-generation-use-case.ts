import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'

interface FinishCertificatesGenerationUseCaseInput {
    dataSourceRowId: string
    success: boolean
    totalBytes?: number
}

export class FinishCertificatesGenerationUseCase {
    constructor(
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'getById' | 'update'
        >,
    ) {}

    async execute(input: FinishCertificatesGenerationUseCaseInput) {
        const dataSourceRow = await this.dataSourceRowsRepository.getById(
            input.dataSourceRowId,
        )

        if (!dataSourceRow) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE_ROW)
        }

        if (input.success) {
            if (!input.totalBytes) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.FILE_BYTES_MISSING,
                )
            }

            dataSourceRow.finishGenerationSuccessfully(input.totalBytes)
        } else {
            dataSourceRow.finishGenerationWithError()
        }

        await this.dataSourceRowsRepository.update(dataSourceRow)

        return {
            certificateEmissionId:
                dataSourceRow.serialize().certificateEmissionId,
        }
    }
}
