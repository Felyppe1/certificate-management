import z from 'zod'
import { INPUT_METHOD } from './certificate'

export const FORBIDDEN_TYPE_CHANGE: Record<ColumnType, ColumnType[]> = {
    string: [],
    number: ['boolean'],
    boolean: ['date', 'number'],
    date: ['boolean'],
    array: [],
}

const UNSAFE_TYPE_CHANGE: Record<ColumnType, ColumnType[]> = {
    string: ['number', 'boolean', 'date'],
    number: ['date'],
    boolean: [],
    date: ['number'],
    array: ['number', 'boolean', 'date'],
}

export enum DATA_SOURCE_FILE_EXTENSION {
    CSV = 'text/csv',
    XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ODS = 'application/vnd.oasis.opendocument.spreadsheet',
    GOOGLE_SHEETS = 'application/vnd.google-apps.spreadsheet',
}

export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'array'

type ArrayMetadata = {
    separator: string
}

export type DataSourceColumn = {
    name: string
    type: ColumnType
    arrayMetadata: ArrayMetadata | null
}

export interface DataSourceInput {
    driveFileId: string | null
    storageFileUrl: string | null
    inputMethod: INPUT_METHOD
    fileName: string
    fileExtension: DATA_SOURCE_FILE_EXTENSION
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

export class DataSource {
    private driveFileId: string | null
    private storageFileUrl: string | null
    private inputMethod: INPUT_METHOD
    private fileName: string
    private fileExtension: DATA_SOURCE_FILE_EXTENSION
    private columns: DataSourceColumn[]
    private columnsRow: number
    private dataRowStart: number
    private thumbnailUrl: string | null

    static create(data: CreateDataSourceInput): DataSource {
        return new DataSource({
            ...data,
            columns: this.inferTypes(data.rows),
        })
    }

    constructor(data: DataSourceInput) {
        if (!data.inputMethod) {
            throw new Error('DataSource input method is required')
        }

        if (!data.fileName) {
            // TODO: validate regex for file name
            throw new Error('DataSource file name is required')
        }

        if (!data.fileExtension) {
            throw new Error('DataSource file extension is required')
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

        this.validateDriveFileId(data.driveFileId, data.inputMethod)
        this.validateStorageFileUrl(data.storageFileUrl, data.inputMethod)

        this.driveFileId = data.driveFileId
        this.storageFileUrl = data.storageFileUrl
        this.inputMethod = data.inputMethod
        this.fileName = data.fileName
        this.fileExtension = data.fileExtension
        this.thumbnailUrl = data.thumbnailUrl
        this.columnsRow = data.columnsRow ?? 1
        this.dataRowStart = data.dataRowStart ?? 2
        this.columns = data.columns
    }

    setColumns(columns: DataSourceColumn[]) {
        const allColumnsExist = columns.every(column =>
            this.columns.find(c => c.name === column.name),
        )

        if (!allColumnsExist) {
            throw new Error(
                'All existing columns must be present when updating columns',
            )
        }

        const allColumnsValid = columns.every(column => {
            if (column.type === 'array') {
                const separator = column.arrayMetadata?.separator

                return (
                    typeof separator === 'string' &&
                    separator.length >= 1 &&
                    separator.length <= 3
                )
            }

            return column.arrayMetadata === null
        })

        if (!allColumnsValid) {
            throw new Error('All columns must have valid types and metadata')
        }

        // 3. Verificação de Transições de Tipo (NOVA LÓGICA)
        const unsafeColumnNames: string[] = []

        for (const newCol of columns) {
            // Encontramos a coluna antiga correspondente
            // (o find aqui é seguro pois já validamos allColumnsExist acima)
            const oldCol = this.columns.find(c => c.name === newCol.name)!

            // Se o tipo não mudou, pula para a próxima
            if (oldCol.type === newCol.type) {
                continue
            }

            const forbiddenTargets = FORBIDDEN_TYPE_CHANGE[oldCol.type]
            if (forbiddenTargets.includes(newCol.type)) {
                throw new Error(
                    `Forbidden transition: Cannot change column '${newCol.name}' from '${oldCol.type}' to '${newCol.type}'.`,
                )
            }

            const unsafeTargets = UNSAFE_TYPE_CHANGE[oldCol.type]
            if (unsafeTargets?.includes(newCol.type)) {
                unsafeColumnNames.push(newCol.name)
            }
        }

        this.columns = columns

        return unsafeColumnNames
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

        const separator = this.detectArraySeparator(nonEmpty)
        if (separator) {
            return {
                type: 'array',
                arrayMetadata: { separator },
            }
        }

        if (nonEmpty.every(this.isBoolean))
            return { type: 'boolean', arrayMetadata: null }
        if (nonEmpty.every(this.isNumber))
            return { type: 'number', arrayMetadata: null }
        if (nonEmpty.every(this.isDate))
            return { type: 'date', arrayMetadata: null }

        return { type: 'string', arrayMetadata: null }
    }

    private static detectArraySeparator(values: string[]): ',' | ';' | null {
        let commaCount = 0
        let semicolonCount = 0

        for (const value of values) {
            if (!value) continue
            commaCount += (value.match(/,/g) || []).length
            semicolonCount += (value.match(/;/g) || []).length
        }

        // TODO: validate values of the array if it is an array

        if (commaCount === 0 && semicolonCount === 0) return null
        if (commaCount > semicolonCount) return ','
        if (semicolonCount > commaCount) return ';'

        return null
    }

    static isBoolean(value: string): boolean {
        return (
            value.trim().toLowerCase() === 'true' ||
            value.trim().toLowerCase() === 'false'
        )
    }

    static isNumber(value: string): boolean {
        const parsed = z.coerce.number().safeParse(value)

        return parsed.success
    }

    static isDate(value: string): boolean {
        const parsed = z.coerce.date().safeParse(value)

        return parsed.success

        // validate format YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false
        }

        // validate real date
        const [year, month, day] = value.split('-').map(Number)

        const date = new Date(Date.UTC(year, month - 1, day))

        return (
            date.getUTCFullYear() === year &&
            date.getUTCMonth() === month - 1 &&
            date.getUTCDate() === day
        )
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
    //     if (data.fileExtension) this.fileExtension = data.fileExtension
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

    getDriveFileId() {
        return this.driveFileId
    }

    setStorageFileUrl(url: string) {
        this.storageFileUrl = url
    }

    getStorageFileUrl() {
        return this.storageFileUrl
    }

    getColumns() {
        return this.columns
    }

    hasColumn(columnName: string): boolean {
        return this.columns.some(column => column.name === columnName)
    }

    getInputMethod() {
        return this.inputMethod
    }

    setThumbnailUrl(url: string) {
        this.thumbnailUrl = url
    }

    static getFileIdFromUrl(url: string): string | null {
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
        return match ? match[1] : null
    }

    // static extractVariablesFromContent(content: string): string[] {
    //     const matches = [...content.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)]
    //     const columns = matches.map(match => match[1])
    //     const uniqueVariables = Array.from(new Set(columns))

    //     return uniqueVariables
    // }

    static isValidFileExtension(
        fileExtension: string,
    ): fileExtension is DATA_SOURCE_FILE_EXTENSION {
        return Object.values(DATA_SOURCE_FILE_EXTENSION).includes(
            fileExtension as DATA_SOURCE_FILE_EXTENSION,
        )
    }

    serialize(): DataSourceOutput {
        return {
            driveFileId: this.driveFileId,
            storageFileUrl: this.storageFileUrl,
            inputMethod: this.inputMethod,
            fileName: this.fileName,
            fileExtension: this.fileExtension,
            columns: this.columns,
            thumbnailUrl: this.thumbnailUrl,
            columnsRow: this.columnsRow,
            dataRowStart: this.dataRowStart,
        }
    }
}
