import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'

interface FinishCertificatesGenerationUseCaseInput {
    dataSourceRowId: string
    success: boolean
    totalBytes?: number
}

export class FinishCertificatesGenerationUseCase {
    constructor(
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'getById' | 'update' | 'allRowsFinishedProcessing'
        >,
        private certificatesRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private transactionManager: ITransactionManager,
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

        const certificateEmissionId =
            dataSourceRow.serialize().certificateEmissionId

        await this.transactionManager.run(async () => {
            await this.dataSourceRowsRepository.update(dataSourceRow)

            const allFinished =
                await this.dataSourceRowsRepository.allRowsFinishedProcessing(
                    certificateEmissionId,
                )

            if (allFinished) {
                const certificate = await this.certificatesRepository.getById(
                    certificateEmissionId,
                )

                if (certificate) {
                    certificate.markAsGenerated()
                    await this.certificatesRepository.update(certificate)
                }
            }
        })

        return {
            certificateEmissionId,
        }
    }
}
