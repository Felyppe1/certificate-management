import { createId } from '@paralleldrive/cuid2'
import { ColumnType, DataSource } from './data-source'
import z from 'zod'

export enum PROCESSING_STATUS_ENUM {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

interface DataSourceRowInput {
    id: string
    certificateEmissionId: string
    fileBytes: number | null
    data: Record<string, string>
    dataSourceColumns: {
        name: string
        type: ColumnType
    }[]
    processingStatus: PROCESSING_STATUS_ENUM
}

interface DataSourceRowCreate
    extends Omit<DataSourceRowInput, 'id' | 'processingStatus' | 'fileBytes'> {}

interface DataSourceRowOutput {
    id: string
    certificateEmissionId: string
    fileBytes: number | null
    data: Record<string, RowType>
    processingStatus: PROCESSING_STATUS_ENUM
}

export type RowType = string | number | boolean | Date

export class DataSourceRow {
    private id: string
    private certificateEmissionId: string
    private fileBytes: number | null
    private data: Record<string, RowType>
    private processingStatus: PROCESSING_STATUS_ENUM

    static create({
        certificateEmissionId,
        data,
        dataSourceColumns,
    }: DataSourceRowCreate): DataSourceRow {
        return new DataSourceRow({
            certificateEmissionId,
            id: createId(),
            fileBytes: null,
            data,
            dataSourceColumns,
            processingStatus: PROCESSING_STATUS_ENUM.PENDING,
        })
    }

    constructor(input: DataSourceRowInput) {
        if (!input.id) {
            throw new Error('DataSourceRow id is required')
        }

        if (!input.certificateEmissionId) {
            throw new Error('DataSourceRow certificate emission id is required')
        }

        if (!input.data) {
            throw new Error('DataSourceRow data is required')
        }

        if (!input.dataSourceColumns) {
            throw new Error('DataSourceRow data source columns is required')
        }

        if (!input.processingStatus) {
            throw new Error('DataSourceRow processing status is required')
        }

        this.id = input.id
        this.certificateEmissionId = input.certificateEmissionId
        this.fileBytes = input.fileBytes
        this.data = this.parseAndValidate(input.data, input.dataSourceColumns)
        this.processingStatus = input.processingStatus
    }

    startGeneration() {
        this.processingStatus = PROCESSING_STATUS_ENUM.RUNNING
    }

    finishGenerationSuccessfully(fileBytes: number) {
        this.processingStatus = PROCESSING_STATUS_ENUM.COMPLETED
        this.fileBytes = fileBytes
    }

    finishGenerationWithError() {
        this.processingStatus = PROCESSING_STATUS_ENUM.FAILED
    }

    private parseAndValidate(
        rawData: Record<string, string>,
        dataSourceColumns: { name: string; type: ColumnType }[],
    ): Record<string, RowType> {
        const result: Record<string, RowType> = {}

        for (const [columnName, value] of Object.entries(rawData)) {
            const columnDef = dataSourceColumns.find(
                col => col.name === columnName,
            )

            if (!columnDef) {
                throw new Error(
                    `Column "${columnName}" does not exist in the data source`,
                )
            }

            const coercedValue = this.coerceValue(
                value,
                columnDef.type,
                columnName,
            )

            result[columnName] = coercedValue
        }

        return result
    }

    private coerceValue(
        value: string,
        type: ColumnType,
        columnName: string,
    ): RowType {
        let parsed

        switch (type) {
            case 'string':
                parsed = z.coerce.string().safeParse(value)
                if (!parsed.success)
                    throw new Error(`Column "${columnName}" must be string`)
                return parsed.data

            case 'number':
                if (!DataSource.isNumber(value))
                    throw new Error(`Column "${columnName}" must be number`)

                return Number(value)

            case 'boolean':
                if (!DataSource.isBoolean(value))
                    throw new Error(`Column "${columnName}" must be boolean`)
                return value

            case 'date':
                if (!DataSource.isDate(value))
                    throw new Error(`Column "${columnName}" must be Date`)
                return value

            case 'array':
                parsed = z.coerce.string().safeParse(value)
                if (!parsed.success)
                    throw new Error(`Column "${columnName}" must be array`)
                return parsed.data

            default:
                throw new Error(
                    `Unsupported column type "${type}" in "${columnName}"`,
                )
        }
    }

    serialize(): DataSourceRowOutput {
        return {
            id: this.id,
            certificateEmissionId: this.certificateEmissionId,
            fileBytes: this.fileBytes,
            data: this.data,
            processingStatus: this.processingStatus,
        }
    }
}
