import { CertificateEmission } from '../certificate'
import { CreateDataSourceInput, MAX_DATA_SOURCE_ROWS } from '../data-source'
import { DataSourceRow } from '../data-source-row'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../error/validation-error'

interface CreateDataSourceDomainServiceInput {
    certificate: CertificateEmission
    newDataSourceData: CreateDataSourceInput
}

export class DataSourceDomainService {
    createDataSource({
        certificate,
        newDataSourceData,
    }: CreateDataSourceDomainServiceInput) {
        if (newDataSourceData.rows.length > MAX_DATA_SOURCE_ROWS) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_ROWS_EXCEEDED,
            )
        }

        certificate.setDataSource(newDataSourceData)

        const dataSourceColumns = certificate.getDataSourceColumns()

        const dataSourceRows = newDataSourceData.rows.map(row => {
            return DataSourceRow.create({
                certificateEmissionId: certificate.getId(),
                data: row,
                dataSourceColumns,
            })
        })

        return dataSourceRows
    }
}
