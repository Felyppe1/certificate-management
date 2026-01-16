import { Certificate } from '../certificate'
import { CreateDataSourceInput } from '../data-source'
import { DataSourceRow } from '../data-source-row'

interface CreateDataSourceDomainServiceInput {
    certificate: Certificate
    newDataSourceData: CreateDataSourceInput
}

export class DataSourceDomainService {
    createDataSource({
        certificate,
        newDataSourceData,
    }: CreateDataSourceDomainServiceInput) {
        certificate.setDataSource(newDataSourceData)

        const dataSourceColumns = certificate.getDataSourceColumns()

        const dataSourceRows = newDataSourceData.rows.map(row => {
            return DataSourceRow.create({
                certificateEmissionId: certificate.getId(),
                data: row,
                dataSourceColumns,
            })
        })

        console.log('DATA SOURCE ROW', dataSourceRows[0].serialize())

        return dataSourceRows
    }
}
