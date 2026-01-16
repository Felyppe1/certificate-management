import { DataSource, DataSourceColumn } from '../domain/data-source'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'

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
            'getColumnValuesByCertificateEmissionId'
        >,
    ) {}

    async execute(
        data: UpdateDataSourceColumnsUseCaseInput,
    ): Promise<{ invalidColumns: InvalidColumn[] }> {
        const certificate = await this.certificatesRepository.getById(
            data.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.getUserId() !== data.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (!certificate.hasDataSource()) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        const columnsToValidate = certificate.updateDataSourceColumns(
            data.columns,
        )

        if (columnsToValidate.length === 0) {
            await this.certificatesRepository.update(certificate)
            return { invalidColumns: [] }
        }

        const validationResults = await Promise.all(
            columnsToValidate.map(async columnName => {
                const newColumn = data.columns.find(c => c.name === columnName)

                if (!newColumn) return null

                const values =
                    await this.dataSourceRowsRepository.getColumnValuesByCertificateEmissionId(
                        data.certificateId,
                        columnName,
                    )

                const hasInvalidValue = values.some(value => {
                    if (value === null || value.trim() === '') return false

                    return !this.canConvertValue(value, newColumn.type)
                })

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

        await this.certificatesRepository.update(certificate)

        return { invalidColumns: [] }
    }

    private canConvertValue(value: string, toType: string): boolean {
        switch (toType) {
            case 'string':
                return true

            case 'number':
                return DataSource.isNumber(value)

            case 'boolean':
                return DataSource.isBoolean(value)

            case 'date':
                return DataSource.isDate(value)

            case 'array':
                return true

            default:
                return false
        }
    }
}
