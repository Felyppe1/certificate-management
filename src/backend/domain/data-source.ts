import z from 'zod'
import { INPUT_METHOD } from './certificate'
import { ValueObject } from './primitives/value-object'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from './error/validation-error'

export const MAX_DATA_SOURCE_ROWS = 300
export const MAX_DATA_SOURCE_COLUMNS = 20
export const MAX_DATA_SOURCE_BYTES_SIZE = 2 * 1024 * 1024 // 2MB
export const MAX_IMAGE_FILES = 4

export const FORBIDDEN_TYPE_CHANGE: Record<ColumnType, ColumnType[]> = {
    string: [],
    number: ['boolean', 'date'],
    boolean: ['date', 'number'],
    date: ['boolean', 'number'],
    array: [],
}

const UNSAFE_TYPE_CHANGE: Record<ColumnType, ColumnType[]> = {
    string: ['number', 'boolean', 'date', 'array'],
    number: ['array'],
    boolean: ['array'],
    date: ['array'],
    array: ['number', 'boolean', 'date', 'array'],
}

export enum DATA_SOURCE_MIME_TYPE {
    CSV = 'text/csv',
    XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ODS = 'application/vnd.oasis.opendocument.spreadsheet',
    GOOGLE_SHEETS = 'application/vnd.google-apps.spreadsheet',
    PNG = 'image/png',
    JPEG = 'image/jpeg',
}

export const DATA_SOURCE_MIME_TYPE_TO_FILE_EXTENSION: Record<string, string> = {
    [DATA_SOURCE_MIME_TYPE.CSV]: 'csv',
    [DATA_SOURCE_MIME_TYPE.XLSX]: 'xlsx',
    [DATA_SOURCE_MIME_TYPE.PNG]: 'png',
    [DATA_SOURCE_MIME_TYPE.JPEG]: 'jpeg',
}

export type DataSourceFileReference = {
    fileName: string
    driveFileId: string | null
    storageFileUrl: string | null
}

export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'array'

export type ArrayItemType = Exclude<ColumnType, 'array'>

export type ArrayMetadata = {
    separator: string
    itemType: ArrayItemType
}

export type DataSourceColumn = {
    name: string
    type: ColumnType
    arrayMetadata: ArrayMetadata | null
}

export interface DataSourceInput {
    files: DataSourceFileReference[]
    inputMethod: INPUT_METHOD
    fileMimeType: DATA_SOURCE_MIME_TYPE
    thumbnailUrl: string | null
    columnsRow: number
    dataRowStart: number
    columns: DataSourceColumn[]
}

export interface DataSourceOutput extends DataSourceInput {}

export interface CreateDataSourceInput
    extends Omit<DataSourceInput, 'columns'> {
    rows: Record<string, string>[]
}

// export interface UpdateDataSourceInput
//     extends Partial<Omit<DataSourceInput>> {}

export class DataSource extends ValueObject<DataSource> {
    private readonly files: DataSourceFileReference[]
    private readonly inputMethod: INPUT_METHOD
    private readonly fileMimeType: DATA_SOURCE_MIME_TYPE
    private readonly columns: DataSourceColumn[]
    private readonly columnsRow: number
    private readonly dataRowStart: number
    private readonly thumbnailUrl: string | null

    static create(data: CreateDataSourceInput): DataSource {
        if (data.rows.length > MAX_DATA_SOURCE_ROWS) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_ROWS_EXCEEDED,
            )
        }

        const uniqueColumns = new Set(data.rows.flatMap(Object.keys))
        if (uniqueColumns.size > MAX_DATA_SOURCE_COLUMNS) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_COLUMNS_EXCEEDED,
            )
        }

        return new DataSource({
            ...data,
            columns: this.inferTypes(data.rows),
        })
    }

    constructor(data: DataSourceInput) {
        super()

        if (!data.inputMethod) {
            throw new Error('DataSource input method is required')
        }

        if (!data.files || data.files.length === 0) {
            throw new Error('DataSource files are required')
        }

        for (const file of data.files) {
            if (!file.fileName) {
                throw new Error('DataSource file name is required')
            }
        }

        if (!data.fileMimeType) {
            throw new Error('DataSource mimetype is required')
        }

        if (DataSource.isImageMimeType(data.fileMimeType)) {
            if (data.files.length > MAX_IMAGE_FILES) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.DATA_SOURCE_IMAGE_FILES_EXCEEDED,
                )
            }
        } else {
            if (data.files.length !== 1) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.DATA_SOURCE_IMAGE_FILES_EXCEEDED,
                )
            }
        }

        if (!data.columnsRow) {
            throw new Error('DataSource columns row is required')
        }

        if (!data.dataRowStart) {
            throw new Error('DataSource data row start is required')
        }

        if (data.columnsRow < 1) {
            throw new Error('DataSource columns row must be greater than 0')
        }

        if (data.dataRowStart <= data.columnsRow) {
            throw new Error(
                'DataSource data row start must be greater than columns row',
            )
        }

        if (!data.columns) {
            throw new Error('DataSource columns is required')
        }

        this.files = data.files
        this.inputMethod = data.inputMethod
        this.fileMimeType = data.fileMimeType
        this.thumbnailUrl = data.thumbnailUrl
        this.columnsRow = data.columnsRow ?? 1
        this.dataRowStart = data.dataRowStart ?? 2
        this.columns = data.columns
    }

    setColumns(columns: DataSourceColumn[]) {
        const allColumnsFound = columns.every(column =>
            this.columns.find(c => c.name === column.name),
        )

        if (!allColumnsFound) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_COLUMNS_NOT_FOUND,
            )
        }

        const validColumnTypes: ColumnType[] = [
            'string',
            'number',
            'boolean',
            'date',
            'array',
        ]
        const areColumnTypesValid = columns.every(column =>
            validColumnTypes.includes(column.type),
        )

        if (!areColumnTypesValid) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_INVALID_COLUMN_TYPES,
            )
        }

        const areColumnMetadataValid = columns.every(column => {
            if (column.type === 'array') {
                const separator = column.arrayMetadata?.separator
                const itemType = column.arrayMetadata?.itemType

                const isSeparatorValid =
                    typeof separator === 'string' &&
                    separator.length >= 1 &&
                    separator.length <= 3

                const validItemTypes: ArrayItemType[] = [
                    'string',
                    'number',
                    'boolean',
                    'date',
                ]
                const isItemTypeValid =
                    !!itemType && validItemTypes.includes(itemType)

                return isSeparatorValid && isItemTypeValid
            }

            return column.arrayMetadata === null
        })

        if (!areColumnMetadataValid) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_INVALID_COLUMN_METADATA,
            )
        }

        // Type changes verification
        const unsafeColumnNames: string[] = []
        const forbiddenColumns: {
            name: string
            fromType: ColumnType
            toType: ColumnType
        }[] = []

        columns.forEach(newColumn => {
            const oldColumn = this.columns.find(c => c.name === newColumn.name)!

            // TODO: removed it just because an easier logic for the array type is to always check it if it changes
            // if (oldColumn.type === newColumn.type) {
            //     continue
            // }

            const forbiddenTargets = FORBIDDEN_TYPE_CHANGE[oldColumn.type]
            if (forbiddenTargets.includes(newColumn.type)) {
                forbiddenColumns.push({
                    name: newColumn.name,
                    fromType: oldColumn.type,
                    toType: newColumn.type,
                })
            }

            const unsafeTargets = UNSAFE_TYPE_CHANGE[oldColumn.type]
            if (unsafeTargets?.includes(newColumn.type)) {
                unsafeColumnNames.push(newColumn.name)
            }
        })

        if (forbiddenColumns.length > 0) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_COLUMN_TYPE_CHANGE_NOT_ALLOWED,
            )
        }

        return {
            dataSource: new DataSource({ ...this.serialize(), columns }),
            unsafeColumnNames,
        }
    }

    private static inferTypes(
        rows: Record<string, string>[],
    ): DataSourceColumn[] {
        const columnValues: Record<string, string[]> = {}

        for (const row of rows) {
            for (const key in row) {
                columnValues[key] ??= []
                columnValues[key].push(row[key])
            }
        }

        return Object.entries(columnValues).map(([name, values]) => {
            const result = this.inferColumnType(values)
            return {
                name,
                type: result.type,
                arrayMetadata: result.arrayMetadata,
            }
        })
    }

    private static inferColumnType(values: string[]): {
        type: ColumnType
        arrayMetadata: ArrayMetadata | null
    } {
        const nonEmpty = values
            .filter(v => v != null)
            .map(v => v.trim())
            .filter(v => v !== '')

        if (nonEmpty.length === 0) {
            return { type: 'string', arrayMetadata: null }
        }

        if (nonEmpty.every(this.isBoolean))
            return { type: 'boolean', arrayMetadata: null }
        if (nonEmpty.every(this.isNumber))
            return { type: 'number', arrayMetadata: null }
        if (nonEmpty.every(this.isDate))
            return { type: 'date', arrayMetadata: null }

        const arrayMetadata = this.detectArray(nonEmpty)
        if (arrayMetadata) {
            return {
                type: 'array',
                arrayMetadata,
            }
        }

        return { type: 'string', arrayMetadata: null }
    }

    static detectArray(values: string[]): ArrayMetadata | null {
        let commaCount = 0
        let semicolonCount = 0

        for (const value of values) {
            if (!value) continue
            commaCount += (value.match(/,/g) || []).length
            semicolonCount += (value.match(/;/g) || []).length
        }
        console.log({ commaCount, semicolonCount })
        if (commaCount === 0 && semicolonCount === 0) return null

        const separator = commaCount >= semicolonCount ? ',' : ';'

        const items: string[] = []

        for (const value of values) {
            if (!value) continue

            const split = value
                .split(separator)
                .map(v => v.trim())
                .filter(Boolean)

            items.push(...split)
        }

        let itemType: ArrayItemType = 'string'
        if (items.every(this.isBoolean)) itemType = 'boolean'
        if (items.every(this.isNumber)) itemType = 'number'
        if (items.every(this.isDate)) itemType = 'date'

        console.log({ itemType })
        return { separator, itemType }
    }

    static isBoolean(value: string): boolean {
        const normalizedValue = value.trim().toLowerCase()

        return (
            normalizedValue === 'true' ||
            normalizedValue === 'false' ||
            normalizedValue === 'verdadeiro' ||
            normalizedValue === 'falso' ||
            normalizedValue === '1' ||
            normalizedValue === '0'
        )
    }

    static isNumber(value: string): boolean {
        let cleaned = value.trim()

        // --- 1. STRUCTURAL GATEKEEPER (REGEX) ---
        // BR Rule: Accepts direct numbers (1000) OR groups of 3 digits separated by a dot (1.000.000),
        // followed by an optional decimal comma (,90)
        const isValidBR = /^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(
            cleaned,
        )

        // US Rule: Accepts direct numbers (1000) OR groups of 3 digits separated by a comma (1,000,000),
        // followed by an optional decimal dot (.90)
        const isValidUS = /^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(
            cleaned,
        )

        if (!isValidBR && !isValidUS) {
            return false
        }

        // --- 2. NORMALIZATION ---
        // (From here on, we are sure the string is safe and the thousands separators are correct)
        const hasDot = cleaned.includes('.')
        const hasComma = cleaned.includes(',')

        if (hasDot && hasComma) {
            const lastDotIndex = cleaned.lastIndexOf('.')
            const lastCommaIndex = cleaned.lastIndexOf(',')

            if (lastCommaIndex > lastDotIndex) {
                // BR format (Comma comes last): 1.100.100,90
                cleaned = cleaned.replaceAll('.', '').replace(',', '.')
            } else {
                // US format (Dot comes last): 1,100,100.90
                cleaned = cleaned.replaceAll(',', '')
            }
        } else if (hasComma) {
            const commaCount = (cleaned.match(/,/g) || []).length
            if (commaCount > 1) {
                // US thousand separator
                cleaned = cleaned.replaceAll(',', '')
            } else {
                // BR decimal
                cleaned = cleaned.replace(',', '.')
            }
        } else if (hasDot) {
            const dotCount = (cleaned.match(/\./g) || []).length
            if (dotCount > 1) {
                // BR thousand separator
                cleaned = cleaned.replaceAll('.', '')
            }
        }

        const parsed = z.coerce.number().safeParse(cleaned)

        return parsed.success
    }

    static isDate(value: string): boolean {
        const brDateTime =
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{2}):(\d{2})(?::(\d{2}))?)?$/

        const match = value.match(brDateTime)

        if (match) {
            let day = Number(match[1])
            let month = Number(match[2])
            const year = Number(match[3])
            const hour = Number(match[4] ?? 0)
            const minute = Number(match[5] ?? 0)
            const second = Number(match[6] ?? 0)

            if (day <= 12 && month > 12) {
                ;[day, month] = [month, day]
            }

            let date: Date

            try {
                date = new Date(year, month - 1, day, hour, minute, second)
            } catch (_) {
                return false
            }

            return (
                date.getFullYear() === year &&
                date.getMonth() === month - 1 &&
                date.getDate() === day &&
                date.getHours() === hour &&
                date.getMinutes() === minute &&
                date.getSeconds() === second
            )
        }

        const blockedFormats = [
            /^\d+$/, // "2024", "1"
            /^\d+\.\d+$/, // "8.9"
            /^\d+\,\d+$/, // "8,9"
            /^\d+-\d+$/, // "8-9"
            /^\d+\/\d+$/, // "8/9"
            // /[a-zA-Z]/, // any letter
        ]

        if (blockedFormats.some(r => r.test(value))) {
            return false
        }

        const parsed = z.coerce.date().safeParse(value)

        return parsed.success
    }

    // update(data: Partial<Omit<DataSourceInput, 'id'>>) {
    //     if (data.inputMethod) this.inputMethod = data.inputMethod

    //     if (data.driveFileId !== undefined) {
    //         this.validateDriveFileId(data.driveFileId, this.inputMethod)
    //         this.driveFileId = data.driveFileId
    //     }

    //     if (data.storageFileUrl !== undefined) {
    //         this.validateStorageFileUrl(data.storageFileUrl, this.inputMethod)
    //         this.storageFileUrl = data.storageFileUrl
    //     }

    //     if (data.fileName) this.fileName = data.fileName
    //     if (data.fileMimeType) this.fileMimeType = data.fileMimeType
    //     if (data.columns) this.columns = data.columns
    //     if (data.thumbnailUrl !== undefined)
    //         this.thumbnailUrl = data.thumbnailUrl
    // }

    private validateDriveFileId(
        driveFileId: string | null,
        inputMethod: INPUT_METHOD,
    ) {
        if (inputMethod === INPUT_METHOD.UPLOAD && driveFileId) {
            throw new Error(
                'Drive file ID should not be provided for UPLOAD input method',
            )
        }
    }

    private validateStorageFileUrl(
        storageFileUrl: string | null,
        inputMethod: INPUT_METHOD,
    ) {
        if (inputMethod !== INPUT_METHOD.UPLOAD && storageFileUrl) {
            throw new Error(
                'File storage URL should only be provided for UPLOAD input method',
            )
        }
    }

    getDriveFileId(fileIndex = 0) {
        return this.files[fileIndex]?.driveFileId ?? null
    }

    getDriveFileIds(): string[] {
        return this.files
            .map(f => f.driveFileId)
            .filter((id): id is string => id !== null)
    }

    /** Returns the storage URL of the first file (used for download/refresh). */
    getStorageFileUrl(fileIndex = 0) {
        return this.files[fileIndex]?.storageFileUrl ?? null
    }

    /** Returns all non-null storage URLs (used for bucket cleanup). */
    getStorageFileUrls(): string[] {
        return this.files
            .map(f => f.storageFileUrl)
            .filter((url): url is string => url !== null)
    }

    getFiles(): DataSourceFileReference[] {
        return this.files
    }

    setStorageFileUrl(url: string): DataSource {
        const updatedFiles = this.files.map((f, i) =>
            i === 0 ? { ...f, storageFileUrl: url } : f,
        )
        return new DataSource({ ...this.serialize(), files: updatedFiles })
    }

    setStorageFileUrls(urls: string[]): DataSource {
        const updatedFiles = this.files.map((f, i) => ({
            ...f,
            storageFileUrl: urls[i] ?? f.storageFileUrl,
        }))
        return new DataSource({ ...this.serialize(), files: updatedFiles })
    }

    getColumns() {
        return this.columns
    }

    hasImageMimeType(): boolean {
        return (
            this.fileMimeType === DATA_SOURCE_MIME_TYPE.PNG ||
            this.fileMimeType === DATA_SOURCE_MIME_TYPE.JPEG
        )
    }

    hasColumn(columnName: string): boolean {
        return this.columns.some(column => column.name === columnName)
    }

    getInputMethod() {
        return this.inputMethod
    }

    setThumbnailUrl(url: string): DataSource {
        return new DataSource({ ...this.serialize(), thumbnailUrl: url })
    }

    equals(other: DataSource): boolean {
        return (
            JSON.stringify(this.serialize()) ===
            JSON.stringify(other.serialize())
        )
    }

    static getFileIdFromUrl(url: string): string | null {
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
        return match ? match[1] : null
    }

    static isImageMimeType(mimeType: string): boolean {
        return (
            mimeType === DATA_SOURCE_MIME_TYPE.PNG ||
            mimeType === DATA_SOURCE_MIME_TYPE.JPEG
        )
    }

    // static extractVariablesFromContent(content: string): string[] {
    //     const matches = [...content.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)]
    //     const columns = matches.map(match => match[1])
    //     const uniqueVariables = Array.from(new Set(columns))

    //     return uniqueVariables
    // }

    static isValidFileMimeType(
        fileMimeType: string,
    ): fileMimeType is DATA_SOURCE_MIME_TYPE {
        return Object.values(DATA_SOURCE_MIME_TYPE).includes(
            fileMimeType as DATA_SOURCE_MIME_TYPE,
        )
    }

    serialize(): DataSourceOutput {
        return {
            files: this.files,
            inputMethod: this.inputMethod,
            fileMimeType: this.fileMimeType,
            columns: this.columns,
            thumbnailUrl: this.thumbnailUrl,
            columnsRow: this.columnsRow,
            dataRowStart: this.dataRowStart,
        }
    }
}
