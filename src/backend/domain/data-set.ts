import { createId } from '@paralleldrive/cuid2'
import { ValidationError } from './error/validation-error'
import { AggregateRoot } from './primitives/aggregate-root'

export enum GENERATION_STATUS {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

interface DataSetInput {
    id: string
    dataSourceId: string
    generationStatus: GENERATION_STATUS
    rows: Record<string, any>[]
}

interface CreateDataSet extends Omit<DataSetInput, 'id' | 'generationStatus'> {}

interface DataSetOutput extends DataSetInput {}

export class DataSet extends AggregateRoot {
    private id: string
    private dataSourceId: string
    private generationStatus: GENERATION_STATUS
    private rows: Record<string, any>[]

    static create(data: CreateDataSet): DataSet {
        return new DataSet({
            id: createId(),
            generationStatus: GENERATION_STATUS.PENDING,
            ...data,
        })
    }

    constructor(data: DataSetInput) {
        super()

        if (!data.id) {
            throw new ValidationError('DataSet ID is required')
        }

        if (!data.dataSourceId) {
            throw new ValidationError('DataSource ID is required')
        }

        if (!data.generationStatus) {
            throw new ValidationError('Generation status is required')
        }

        if (!data.rows) {
            throw new ValidationError('DataSet rows are required')
        }

        this.id = data.id
        this.dataSourceId = data.dataSourceId
        this.generationStatus = data.generationStatus
        this.rows = data.rows
    }

    update(data: Partial<Omit<DataSetInput, 'id'>>) {
        if (data.dataSourceId) this.dataSourceId = data.dataSourceId
        if (data.generationStatus) this.generationStatus = data.generationStatus
        if (data.rows) this.rows = data.rows
    }

    serialize(): DataSetOutput {
        return {
            id: this.id,
            dataSourceId: this.dataSourceId,
            generationStatus: this.generationStatus,
            rows: this.rows,
        }
    }
}
