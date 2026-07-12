import {
    ArrayMetadata,
    ColumnType,
    DataSourceColumn,
    DataSourceColumnInput,
} from '../domain/data-source-column'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'

interface UpdateDataSourceColumnsUseCaseInput {
    userId: string
    certificateId: string
    columns: DataSourceColumnInput[]
}

interface InvalidColumn {
    name: string
    toType: string
}

export class UpdateDataSourceColumnsUseCase {
    constructor(
        private certificatesRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            | 'getColumnValuesByCertificateEmissionId'
            | 'resetProcessingStatusByCertificateEmissionId'
        >,
        private transactionManager: Pick<ITransactionManager, 'run'>,
    ) {}

    async execute(
        data: UpdateDataSourceColumnsUseCaseInput,
    ): Promise<{ invalidColumns: InvalidColumn[] }> {
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

        if (!certificateEmission.hasDataSource()) {
            throw new DataSourceNotFoundError()
        }

        const columnsToValidate = certificateEmission.updateDataSourceColumns(
            data.columns,
        )

        const validationResults = await Promise.all(
            columnsToValidate.map(async columnName => {
                const newColumn = data.columns.find(c => c.name === columnName)!

                const values =
                    await this.dataSourceRowsRepository.getColumnValuesByCertificateEmissionId(
                        data.certificateId,
                        columnName,
                    )

                const hasInvalidValue = !this.canConvertValues(
                    values,
                    newColumn.type,
                    newColumn.arrayMetadata ?? undefined,
                )

                if (hasInvalidValue) {
                    return {
                        name: columnName,
                        toType: newColumn.type,
                    }
                }

                return null
            }),
        )

        const invalidColumns = validationResults.filter(
            result => result !== null,
        )

        if (invalidColumns.length > 0) {
            return { invalidColumns }
        }

        certificateEmission.markAsDraft()

        await this.transactionManager.run(async () => {
            await this.dataSourceRowsRepository.resetProcessingStatusByCertificateEmissionId(
                certificateEmission.getId(),
            )
            await this.certificatesRepository.update(certificateEmission)
        })

        return { invalidColumns: [] }
    }

    private canConvertValues(
        values: string[],
        toType: ColumnType,
        arrayMetadata?: ArrayMetadata,
    ): boolean {
        if (toType === 'string') return true // TODO: não precisa porque nenhum vai dizer que é perigoso trocar para string

        const nonEmpty = values
            .filter(Boolean)
            .map(v => v.trim())
            .filter(Boolean)

        if (nonEmpty.length === 0) return true

        if (toType === 'array') {
            if (!arrayMetadata) return false

            const items: string[] = []
            for (const value of nonEmpty) {
                if (!value) continue

                const split = value
                    .split(arrayMetadata.separator)
                    .map(v => v.trim())
                    .filter(Boolean)

                items.push(...split)
            }

            if (arrayMetadata.itemType === 'string') return true
            if (
                arrayMetadata.itemType === 'boolean' &&
                items.every(DataSourceColumn.isBoolean)
            )
                return true
            if (
                arrayMetadata.itemType === 'number' &&
                items.every(DataSourceColumn.isNumber)
            )
                return true
            if (
                arrayMetadata.itemType === 'date' &&
                items.every(DataSourceColumn.isDate)
            )
                return true

            return false
        } else {
            return nonEmpty.every(value => {
                if (toType === 'number') {
                    return DataSourceColumn.isNumber(value)
                } else if (toType === 'boolean') {
                    return DataSourceColumn.isBoolean(value)
                } else if (toType === 'date') {
                    return DataSourceColumn.isDate(value)
                }
            })
        }
    }
}
