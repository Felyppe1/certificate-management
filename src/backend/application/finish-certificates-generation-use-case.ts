import { DataSourceRowNotFoundError } from '../domain/error/not-found-error/data-source-row-not-found-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { FileBytesMissingError } from '../domain/error/validation-error/file-bytes-missing-error'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
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
            throw new DataSourceRowNotFoundError()
        }

        if (input.success) {
            if (!input.totalBytes) {
                throw new FileBytesMissingError()
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
            throw new CertificateNotFoundError()
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
