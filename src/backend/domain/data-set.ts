import { createId } from '@paralleldrive/cuid2'
import { AggregateRoot } from './primitives/aggregate-root'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from './error/validation-error'

export enum GENERATION_STATUS {
    PENDING = 'PENDING', // TODO: change to IN_PROGRESS
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

interface DataSetInput {
    id: string
    dataSourceId: string
    generationStatus: GENERATION_STATUS | null
    totalBytes: number
    rows: Record<string, any>[]
}

interface CreateDataSet
    extends Omit<DataSetInput, 'id' | 'generationStatus' | 'totalBytes'> {}

interface DataSetOutput extends DataSetInput {}

export class DataSet extends AggregateRoot {
    private id: string
    private dataSourceId: string
    private generationStatus: GENERATION_STATUS | null
    private totalBytes: number
    private rows: Record<string, any>[]

    static create(data: CreateDataSet): DataSet {
        return new DataSet({
            ...data,
            id: createId(),
            generationStatus: null,
            totalBytes: 0,
        })
    }

    constructor(data: DataSetInput) {
        super()

        if (!data.id) {
            throw new Error('DataSet ID is required')
        }

        if (!data.dataSourceId) {
            throw new Error('DataSource ID is required')
        }

        if (!data.rows) {
            throw new Error('DataSet rows are required')
        }

        if (data.totalBytes === undefined || data.totalBytes === null) {
            throw new Error('DataSet totalBytes is required')
        }

        this.id = data.id
        this.dataSourceId = data.dataSourceId
        this.generationStatus = data.generationStatus
        this.totalBytes = data.totalBytes
        this.rows = data.rows
    }

    hasRows() {
        return this.rows.length > 0
    }

    update(data: Partial<Omit<DataSetInput, 'id'>>) {
        if (data.dataSourceId) this.dataSourceId = data.dataSourceId
        // TODO: could validate that from null -> IN_PROGRESS -> COMPLETED/FAILED
        if (data.generationStatus !== undefined) {
            if (data.generationStatus === GENERATION_STATUS.PENDING) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.CERTIFICATES_GENERATION_IN_PROGRESS,
                )
            }

            this.generationStatus = data.generationStatus
        }
        if (data.totalBytes !== undefined) this.totalBytes = data.totalBytes
        if (data.rows) this.rows = data.rows
    }

    serialize(): DataSetOutput {
        return {
            id: this.id,
            dataSourceId: this.dataSourceId,
            generationStatus: this.generationStatus,
            totalBytes: this.totalBytes,
            rows: this.rows,
        }
    }
}
