import {
    ArrayMetadata,
    ColumnType,
    DataSource,
    DataSourceColumn,
} from '../domain/data-source'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'

interface UpdateDataSourceColumnsUseCaseInput {
    userId: string
    certificateId: string
    columns: DataSourceColumn[]
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
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (!certificateEmission.isOwner(data.userId)) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (certificateEmission.isEmitted()) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.CERTIFICATE_EMITTED)
        }

        if (!certificateEmission.hasDataSource()) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
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
                items.every(DataSource.isBoolean)
            )
                return true
            if (
                arrayMetadata.itemType === 'number' &&
                items.every(DataSource.isNumber)
            )
                return true
            if (
                arrayMetadata.itemType === 'date' &&
                items.every(DataSource.isDate)
            )
                return true

            return false
        } else {
            return nonEmpty.every(value => {
                if (toType === 'number') {
                    return DataSource.isNumber(value)
                } else if (toType === 'boolean') {
                    return DataSource.isBoolean(value)
                } else if (toType === 'date') {
                    return DataSource.isDate(value)
                }
            })
        }
    }
}
