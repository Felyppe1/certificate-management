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

export interface DataSetInput {
    id: string
    certificateEmissionId: string
    generationStatus: GENERATION_STATUS | null
    totalBytes: number
    rows: Record<string, any>[]
}

interface CreateDataSet
    extends Omit<DataSetInput, 'id' | 'generationStatus' | 'totalBytes'> {}

interface DataSetOutput extends DataSetInput {}

export class DataSet extends AggregateRoot {
    private id: string
    private certificateEmissionId: string
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

        if (!data.certificateEmissionId) {
            throw new Error('DataSet certificateEmissionId is required')
        }

        if (!data.rows) {
            throw new Error('DataSet rows are required')
        }

        if (data.totalBytes === undefined || data.totalBytes === null) {
            throw new Error('DataSet totalBytes is required')
        }

        this.id = data.id
        this.certificateEmissionId = data.certificateEmissionId
        this.generationStatus = data.generationStatus
        this.totalBytes = data.totalBytes
        this.rows = data.rows
    }

    getGenerationStatus() {
        return this.generationStatus
    }

    hasRows() {
        return this.rows.length > 0
    }

    getRowsFromColumn(columnName: string): string[] {
        return this.rows.map(row => row[columnName])
    }

    getRowsCount() {
        return this.rows.length
    }

    markAsRunning() {
        if (this.generationStatus === GENERATION_STATUS.PENDING) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.GENERATION_ALREADY_IN_PROGRESS,
            )
        }

        this.generationStatus = GENERATION_STATUS.PENDING
    }

    update(data: Partial<Omit<DataSetInput, 'id' | 'certificateEmissionId'>>) {
        // TODO: could validate that from null -> IN_PROGRESS -> COMPLETED/FAILED
        if (data.generationStatus !== undefined) {
            if (
                this.generationStatus === GENERATION_STATUS.PENDING &&
                data.generationStatus === GENERATION_STATUS.PENDING
            ) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.GENERATION_ALREADY_IN_PROGRESS,
                )
            }

            if (data.generationStatus === GENERATION_STATUS.COMPLETED) {
                if (!this.hasRows()) {
                    throw new Error('Cannot complete empty data set')
                }
            }

            this.generationStatus = data.generationStatus
        }
        if (data.totalBytes !== undefined) this.totalBytes = data.totalBytes
        if (data.rows) this.rows = data.rows
    }

    serialize(): DataSetOutput {
        return {
            id: this.id,
            certificateEmissionId: this.certificateEmissionId,
            generationStatus: this.generationStatus,
            totalBytes: this.totalBytes,
            rows: this.rows,
        }
    }
}
