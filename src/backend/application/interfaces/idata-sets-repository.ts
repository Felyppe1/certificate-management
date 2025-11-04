import { DataSet } from '@/backend/domain/data-set'

export interface IDataSetsRepository {
    save(dataSet: DataSet): Promise<void>
    getById(dataSetId: string): Promise<DataSet | null>
    getByDataSourceId(dataSourceId: string): Promise<DataSet | null>
    upsert(dataSet: DataSet): Promise<void>
}
