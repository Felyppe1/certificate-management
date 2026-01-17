import {
    DataSourceRow,
    PROCESSING_STATUS_ENUM,
} from '@/backend/domain/data-source-row'

export interface IDataSourceRowsRepository {
    getById(id: string): Promise<DataSourceRow | null>
    update(dataSourceRow: DataSourceRow): Promise<void>
    saveMany(dataSourceRows: DataSourceRow[]): Promise<void>

    updateManyProcessingStatus(
        ids: string[],
        status: PROCESSING_STATUS_ENUM,
    ): Promise<void>
    deleteManyByCertificateEmissionId(
        certificateEmissionId: string,
    ): Promise<void>
    resetProcessingStatusByCertificateEmissionId(
        certificateEmissionId: string,
    ): Promise<void>
    getColumnValuesByCertificateEmissionId(
        certificateEmissionId: string,
        columnName: string,
    ): Promise<string[]>
    allRowsFinishedProcessing(certificateEmissionId: string): Promise<boolean>
}
