import { createId } from '@paralleldrive/cuid2'
import {
    ArrayMetadata,
    ColumnType,
    DataSource,
    DataSourceColumn,
} from './data-source'
import z from 'zod'

export enum PROCESSING_STATUS_ENUM {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    RETRYING = 'RETRYING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

interface DataSourceRowInput {
    id: string
    certificateEmissionId: string
    fileBytes: number | null
    data: Record<string, string>
    processingStatus: PROCESSING_STATUS_ENUM
    sourceRowIndex: number
}

interface DataSourceRowCreate
    extends Omit<DataSourceRowInput, 'id' | 'processingStatus' | 'fileBytes'> {
    dataSourceColumns: DataSourceColumn[]
}

interface DataSourceRowOutput {
    id: string
    certificateEmissionId: string
    fileBytes: number | null
    data: Record<string, string>
    processingStatus: PROCESSING_STATUS_ENUM
    sourceRowIndex: number
}

export class DataSourceRow {
    private id: string
    private certificateEmissionId: string
    private fileBytes: number | null
    private data: Record<string, string>
    private processingStatus: PROCESSING_STATUS_ENUM
    private sourceRowIndex: number

    static create({
        certificateEmissionId,
        data,
        dataSourceColumns,
        sourceRowIndex,
    }: DataSourceRowCreate): DataSourceRow {
        Object.entries(data).forEach(([columnName, value]) => {
            const dataSourceColumn = dataSourceColumns.find(
                col => col.name === columnName,
            )

            if (!dataSourceColumn) {
                throw new Error(
                    `Column "${columnName}" does not exist in the data source`,
                )
            }

            const isValid = DataSourceRow.validateValue(
                value,
                dataSourceColumn.type,
                dataSourceColumn.arrayMetadata,
            )

            if (!isValid) {
                throw new Error(
                    `Column "${columnName}" has invalid value "${value}" for type "${dataSourceColumn.type}"`,
                )
            }
        })

        return new DataSourceRow({
            certificateEmissionId,
            id: createId(),
            fileBytes: null,
            data,
            processingStatus: PROCESSING_STATUS_ENUM.PENDING,
            sourceRowIndex,
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

        if (!input.processingStatus) {
            throw new Error('DataSourceRow processing status is required')
        }

        this.id = input.id
        this.certificateEmissionId = input.certificateEmissionId
        this.fileBytes = input.fileBytes
        this.data = input.data
        this.processingStatus = input.processingStatus
        this.sourceRowIndex = input.sourceRowIndex
    }

    startGeneration() {
        this.processingStatus = PROCESSING_STATUS_ENUM.RUNNING
    }

    startRetry() {
        if (this.processingStatus !== PROCESSING_STATUS_ENUM.FAILED) {
            throw new Error(
                'DataSourceRow can only be retried if it is in FAILED status',
            )
        }

        this.processingStatus = PROCESSING_STATUS_ENUM.RETRYING
    }

    finishGenerationSuccessfully(fileBytes: number) {
        if (!fileBytes) {
            throw new Error(
                'DataSourceRow file bytes is required for successful generation',
            )
        }

        this.processingStatus = PROCESSING_STATUS_ENUM.COMPLETED
        this.fileBytes = fileBytes
    }

    finishGenerationWithError() {
        this.processingStatus = PROCESSING_STATUS_ENUM.FAILED
    }

    updateData(
        newData: Record<string, string>,
        dataSourceColumns: DataSourceColumn[],
    ) {
        Object.entries(newData).forEach(([columnName, value]) => {
            const dataSourceColumn = dataSourceColumns.find(
                col => col.name === columnName,
            )

            if (!dataSourceColumn) {
                throw new Error(
                    `Column "${columnName}" does not exist in the data source`,
                )
            }

            const isValid = DataSourceRow.validateValue(
                value,
                dataSourceColumn.type,
                dataSourceColumn.arrayMetadata,
            )

            if (!isValid) {
                throw new Error(
                    `Column "${columnName}" has invalid value "${value}" for type "${dataSourceColumn.type}"`,
                )
            }
        })

        this.data = { ...this.data, ...newData }
    }

    resetProcessingStatus() {
        this.processingStatus = PROCESSING_STATUS_ENUM.PENDING
        this.fileBytes = null
    }

    getId() {
        return this.id
    }

    getProcessingStatus() {
        return this.processingStatus
    }

    getCertificateEmissionId() {
        return this.certificateEmissionId
    }

    static validateValue(
        value: string,
        columnType: ColumnType,
        arrayMetadata: ArrayMetadata | null,
    ): boolean {
        if (columnType === 'string') return true
        if (columnType === 'number') return DataSource.isNumber(value)
        if (columnType === 'boolean') return DataSource.isBoolean(value)
        if (columnType === 'date') return DataSource.isDate(value)

        if (columnType === 'array') {
            if (!arrayMetadata)
                throw new Error('Array metadata is required for array type')

            const items = value
                .split(arrayMetadata.separator)
                .map(v => v.trim())
                .filter(Boolean)

            if (arrayMetadata.itemType === 'string') return true
            if (
                arrayMetadata.itemType === 'boolean' &&
                items.every(DataSource.isBoolean)
            )
                return true
            if (
                arrayMetadata.itemType === 'number' &&
                items.every(DataSource.isNumber)
            )
                return true
            if (
                arrayMetadata.itemType === 'date' &&
                items.every(DataSource.isDate)
            )
                return true

            return false
        }

        throw new Error('Invalid column type')
    }

    serialize(): DataSourceRowOutput {
        return {
            id: this.id,
            certificateEmissionId: this.certificateEmissionId,
            fileBytes: this.fileBytes,
            data: this.data,
            processingStatus: this.processingStatus,
            sourceRowIndex: this.sourceRowIndex,
        }
    }
}
