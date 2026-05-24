import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { DataSourceInvalidInputMethodError } from '../domain/error/validation-error/data-source-invalid-input-method-error'
import { DataSourceRowsNotFoundError } from '../domain/error/validation-error/data-source-rows-not-found-error'
import { INPUT_METHOD } from '../domain/certificate'

export interface UpdateDataSourceRowsUseCaseInput {
    userId: string
    certificateId: string
    editedRows: {
        rowId: string
        data: {
            column: string
            newValue: string
        }[]
    }[]
}

export class UpdateDataSourceRowsUseCase {
    constructor(
        private certificatesRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            | 'getByIds'
            | 'updateMany'
            | 'resetProcessingStatusByCertificateEmissionId'
        >,
        private transactionManager: Pick<ITransactionManager, 'run'>,
    ) {}

    async execute(data: UpdateDataSourceRowsUseCaseInput): Promise<void> {
        const certificateEmission = await this.certificatesRepository.getById(
            data.certificateId,
        )

        if (!certificateEmission) {
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(data.userId)) {
            throw new NotCertificateOwnerError()
        }

        if (certificateEmission.isEmitted()) {
            throw new CertificateEmittedError()
        }

        if (
            certificateEmission.getDataSourceInputMethod() !==
            INPUT_METHOD.UPLOAD
        ) {
            throw new DataSourceInvalidInputMethodError()
        }

        if (!certificateEmission.hasDataSource()) {
            throw new DataSourceNotFoundError()
        }

        const rowIds = data.editedRows.map(r => r.rowId)
        if (rowIds.length === 0) return

        const rows = await this.dataSourceRowsRepository.getByIds(rowIds)
        if (rows.length !== rowIds.length) {
            throw new DataSourceRowsNotFoundError()
        }

        // const errors: string[] = []

        rows.forEach(row => {
            const editedRow = data.editedRows.find(
                e => e.rowId === row.getId(),
            )!

            const newData: Record<string, string> = {}
            editedRow.data.forEach(item => {
                newData[item.column] = item.newValue
            })

            row.updateData(newData, certificateEmission.getDataSourceColumns())
            row.resetProcessingStatus()
            // try {
            //     row.updateData(newData, certificateEmission.getDataSourceColumns())
            //     row.resetProcessingStatus()
            // } catch (err: any) {
            //     errors.push(`Erro: ${err.message}`)
            // }
        })

        // if (errors.length > 0) {
        //     const uniqueErrors = Array.from(new Set(errors))
        //     throw new ValidationError(
        //         VALIDATION_ERROR_TYPE.INVALID_ROW_DATA,
        //         undefined,
        //         uniqueErrors.join('\n'),
        //     )
        // }

        certificateEmission.markAsDraft()

        await this.transactionManager.run(async () => {
            if (certificateEmission.hasDataSource()) {
                await this.dataSourceRowsRepository.resetProcessingStatusByCertificateEmissionId(
                    certificateEmission.getId(),
                )
            }

            await this.certificatesRepository.update(certificateEmission)
            await this.dataSourceRowsRepository.updateMany(rows)
        })
    }
}
