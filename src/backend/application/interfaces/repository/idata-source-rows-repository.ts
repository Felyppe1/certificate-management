import { DataSourceRow } from '@/backend/domain/data-source-row'

export interface IDataSourceRowsRepository {
    getById(id: string): Promise<DataSourceRow | null>
    update(dataSourceRow: DataSourceRow): Promise<void>
    saveMany(dataSourceRows: DataSourceRow[]): Promise<void>
    updateMany(dataSourceRows: DataSourceRow[]): Promise<void>
    deleteManyByCertificateEmissionId(
        certificateEmissionId: string,
    ): Promise<void>
    getManyByCertificateEmissionId(
        certificateEmissionId: string,
    ): Promise<DataSourceRow[]>
    resetProcessingStatusByCertificateEmissionId(
        certificateEmissionId: string,
    ): Promise<void>
    getColumnValuesByCertificateEmissionId(
        certificateEmissionId: string,
        columnName: string,
    ): Promise<string[]>
}
