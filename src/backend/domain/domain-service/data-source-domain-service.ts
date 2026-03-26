import { CertificateEmission } from '../certificate'
import { CreateDataSourceInput } from '../data-source'
import { DataSourceRow } from '../data-source-row'

interface CreateDataSourceDomainServiceInput {
    certificate: CertificateEmission
    newDataSourceData: CreateDataSourceInput
}

export class DataSourceDomainService {
    createDataSource({
        certificate,
        newDataSourceData,
    }: CreateDataSourceDomainServiceInput) {
        certificate.setDataSource(newDataSourceData)

        const dataSourceColumns = certificate.getDataSourceColumns()

        const dataSourceRows = newDataSourceData.rows.map((row, index) => {
            return DataSourceRow.create({
                certificateEmissionId: certificate.getId(),
                data: row,
                dataSourceColumns,
                sourceRowIndex: index,
            })
        })

        return dataSourceRows
    }
}
