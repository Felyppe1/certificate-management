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
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'

interface FinishCertificatesGenerationUseCaseInput {
    dataSourceRowId: string
    success: boolean
    totalBytes?: number
    userId?: string
}

export class FinishCertificatesGenerationUseCase {
    constructor(
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'getById' | 'update' | 'allRowsFinishedProcessing'
        >,
        private certificatesRepository: Pick<
            ICertificatesRepository,
            'checkIfExistsById' | 'markAsGeneratedIfNotAlready'
        >,
        private usersRepository: Pick<IUsersRepository, 'upsertDailyUsage'>,
        private transactionManager: Pick<ITransactionManager, 'run'>,
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

        const certificateExists =
            await this.certificatesRepository.checkIfExistsById(
                certificateEmissionId,
            )

        if (!certificateExists) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        await this.dataSourceRowsRepository.update(dataSourceRow)

        if (input.success && input.userId) {
            await this.usersRepository.upsertDailyUsage(input.userId, {
                certificatesGeneratedCount: 1,
            })
        }

        const allFinished =
            await this.dataSourceRowsRepository.allRowsFinishedProcessing(
                certificateEmissionId,
            )

        if (allFinished) {
            await this.certificatesRepository.markAsGeneratedIfNotAlready(
                certificateEmissionId,
            )
        }

        return {
            certificateEmissionId,
        }
    }
}
