import { INPUT_METHOD } from './certificate'
import {
    DataSourceColumn,
    DataSourceColumnInput,
    ColumnType,
} from './data-source-column'
import { DataSourceFile, DataSourceFileInput } from './data-source-file'
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

export type { DataSourceFileInput as DataSourceFileReference }

export interface DataSourceInput {
    files: DataSourceFileInput[]
    inputMethod: INPUT_METHOD
    fileMimeType: DATA_SOURCE_MIME_TYPE
    thumbnailUrl: string | null
    columnsRow: number
    dataRowStart: number
    columns: DataSourceColumnInput[]
}

export interface DataSourceOutput extends DataSourceInput {}

export interface CreateDataSourceInput
    extends Omit<DataSourceInput, 'columns'> {
    rows: Record<string, string>[]
    columns: string[]
}

// export interface UpdateDataSourceInput
//     extends Partial<Omit<DataSourceInput>> {}

export class DataSource extends ValueObject<DataSource> {
    private readonly files: DataSourceFile[]
    private readonly inputMethod: INPUT_METHOD
    private readonly fileMimeType: DATA_SOURCE_MIME_TYPE
    private readonly columns: DataSourceColumn[]
    private readonly columnsRow: number
    private readonly dataRowStart: number
    private readonly thumbnailUrl: string | null

    static create(data: CreateDataSourceInput): DataSource {
        if (data.columns.length > MAX_DATA_SOURCE_COLUMNS) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_COLUMNS_EXCEEDED,
            )
        }

        if (data.rows.length > MAX_DATA_SOURCE_ROWS) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_ROWS_EXCEEDED,
            )
        }

        data.rows.some(row => {
            Object.keys(row).some(key => {
                if (data.columns.indexOf(key) === -1) {
                    throw new ValidationError(
                        VALIDATION_ERROR_TYPE.DATA_SOURCE_COLUMNS_NOT_FOUND,
                    )
                }
            })
        })

        const columns =
            data.rows.length === 0
                ? data.columns.map(column => ({
                      name: column,
                      type: 'string' as ColumnType,
                      arrayMetadata: null,
                  }))
                : DataSourceColumn.inferTypes(data.rows)

        return new DataSource({
            ...data,
            columns,
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

        if (!data.columns || data.columns.length === 0) {
            throw new Error('DataSource columns is required')
        }

        this.files = data.files.map(f => new DataSourceFile(f))
        this.inputMethod = data.inputMethod
        this.fileMimeType = data.fileMimeType
        this.thumbnailUrl = data.thumbnailUrl
        this.columnsRow = data.columnsRow ?? 1
        this.dataRowStart = data.dataRowStart ?? 2
        this.columns = data.columns.map(c => new DataSourceColumn(c))
    }

    setColumns(columnsRaw: DataSourceColumnInput[]) {
        const columns = columnsRaw.map(c => new DataSourceColumn(c))

        const allColumnsFound = columns.every(column =>
            this.columns.find(c => c.getName() === column.getName()),
        )

        if (!allColumnsFound) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_COLUMNS_NOT_FOUND,
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
            const oldColumn = this.columns.find(
                c => c.getName() === newColumn.getName(),
            )!

            // TODO: removed it just because an easier logic for the array type is to always check it if it changes
            // if (oldColumn.getType() === newColumn.getType()) {
            //     continue
            // }

            const forbiddenTargets = FORBIDDEN_TYPE_CHANGE[oldColumn.getType()]
            if (forbiddenTargets.includes(newColumn.getType())) {
                forbiddenColumns.push({
                    name: newColumn.getName(),
                    fromType: oldColumn.getType(),
                    toType: newColumn.getType(),
                })
            }

            const unsafeTargets = UNSAFE_TYPE_CHANGE[oldColumn.getType()]
            if (unsafeTargets?.includes(newColumn.getType())) {
                unsafeColumnNames.push(newColumn.getName())
            }
        })

        if (forbiddenColumns.length > 0) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_COLUMN_TYPE_CHANGE_NOT_ALLOWED,
            )
        }

        return {
            dataSource: new DataSource({
                ...this.serialize(),
                columns: columnsRaw,
            }),
            unsafeColumnNames,
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
        return this.files[fileIndex]?.getDriveFileId() ?? null
    }

    getDriveFileIds(): string[] {
        return this.files
            .map(f => f.getDriveFileId())
            .filter((id): id is string => id !== null)
    }

    /** Returns the storage URL of the first file (used for download/refresh). */
    getStorageFileUrl(fileIndex = 0) {
        return this.files[fileIndex]?.getStorageFileUrl() ?? null
    }

    /** Returns all non-null storage URLs (used for bucket cleanup). */
    getStorageFileUrls(): string[] {
        return this.files
            .map(f => f.getStorageFileUrl())
            .filter((url): url is string => url !== null)
    }

    getFiles(): DataSourceFileInput[] {
        return this.files.map(f => f.serialize())
    }

    setStorageFileUrl(url: string): DataSource {
        const updatedFiles = this.files.map((f, i) =>
            i === 0 ? { ...f.serialize(), storageFileUrl: url } : f.serialize(),
        )
        return new DataSource({ ...this.serialize(), files: updatedFiles })
    }

    setStorageFileUrls(urls: string[]): DataSource {
        const updatedFiles = this.files.map((f, i) => ({
            ...f.serialize(),
            storageFileUrl: urls[i] ?? f.getStorageFileUrl(),
        }))
        return new DataSource({ ...this.serialize(), files: updatedFiles })
    }

    getColumns(): DataSourceColumnInput[] {
        return this.columns.map(c => c.serialize())
    }

    hasImageMimeType(): boolean {
        return (
            this.fileMimeType === DATA_SOURCE_MIME_TYPE.PNG ||
            this.fileMimeType === DATA_SOURCE_MIME_TYPE.JPEG
        )
    }

    hasColumn(columnName: string): boolean {
        return this.columns.some(column => column.getName() === columnName)
    }

    getFileMimeType() {
        return this.fileMimeType
    }

    getInputMethod() {
        return this.inputMethod
    }

    setThumbnailUrl(url: string): DataSource {
        return new DataSource({ ...this.serialize(), thumbnailUrl: url })
    }

    replaceWithSpreadsheet(
        newFile: DataSourceFileInput,
        newMimeType: DATA_SOURCE_MIME_TYPE.CSV | DATA_SOURCE_MIME_TYPE.XLSX,
        newInputMethod: INPUT_METHOD,
    ): DataSource {
        if (!DataSource.isImageMimeType(this.fileMimeType)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_NOT_IMAGE,
            )
        }

        return new DataSource({
            ...this.serialize(),
            files: [newFile],
            fileMimeType: newMimeType,
            inputMethod: newInputMethod,
        })
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
            files: this.files.map(f => f.serialize()),
            inputMethod: this.inputMethod,
            fileMimeType: this.fileMimeType,
            columns: this.columns.map(c => c.serialize()),
            thumbnailUrl: this.thumbnailUrl,
            columnsRow: this.columnsRow,
            dataRowStart: this.dataRowStart,
        }
    }
}
