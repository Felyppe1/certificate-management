import { DataSourceRow } from '@/backend/domain/data-source-row'

export interface IDataSourceRowsRepository {
    // save(dataSourceRow: DataSourceRow): Promise<void>
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
    // getById(dataSourceRowId: string): Promise<DataSourceRow | null>
    // getByCertificateEmissionId(
    //     certificateEmissionId: string,
    // ): Promise<DataSourceRow[]>
    // upsert(dataSourceRow: DataSourceRow): Promise<void>
}
