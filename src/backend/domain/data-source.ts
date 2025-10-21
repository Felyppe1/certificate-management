import { createId } from '@paralleldrive/cuid2'
import { ValidationError } from './error/validation-error'

export enum INPUT_METHOD {
    URL = 'URL',
    GOOGLE_DRIVE = 'GOOGLE_DRIVE',
    UPLOAD = 'UPLOAD',
}

export enum DATA_SOURCE_FILE_EXTENSION {
    CSV = 'text/csv',
    XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ODS = 'application/vnd.oasis.opendocument.spreadsheet',
    GOOGLE_SHEETS = 'application/vnd.google-apps.spreadsheet',
}

interface DataSourceInput {
    id: string
    driveFileId: string | null
    storageFileUrl: string | null
    inputMethod: INPUT_METHOD
    fileName: string
    fileExtension: DATA_SOURCE_FILE_EXTENSION
    thumbnailUrl: string | null
    columns: string[]
}

export interface DataSourceOutput extends DataSourceInput {}

export interface CreateDataSourceInput extends Omit<DataSourceInput, 'id'> {}

export interface UpdateDataSourceInput
    extends Partial<Omit<DataSourceInput, 'id'>> {}

export class DataSource {
    private id: string
    private driveFileId: string | null
    private storageFileUrl: string | null
    private inputMethod: INPUT_METHOD
    private fileName: string
    private fileExtension: DATA_SOURCE_FILE_EXTENSION
    private columns: string[]
    private thumbnailUrl: string | null

    static create(data: CreateDataSourceInput): DataSource {
        return new DataSource({
            id: createId(),
            ...data,
        })
    }

    constructor(data: DataSourceInput) {
        if (!data.id) {
            throw new ValidationError('DataSource ID is required')
        }

        if (!data.inputMethod) {
            throw new ValidationError('DataSource input method is required')
        }

        if (!data.columns) {
            throw new ValidationError('DataSource columns is required')
        }

        if (!data.fileName) {
            // TODO: validate regex for file name
            throw new ValidationError('DataSource file name is required')
        }

        if (!data.fileExtension) {
            throw new ValidationError('DataSource file extension is required')
        }

        if (data.inputMethod === INPUT_METHOD.UPLOAD && data.driveFileId) {
            throw new ValidationError(
                'Drive file ID should not be provided for UPLOAD input method',
            )
        }

        if (data.inputMethod !== INPUT_METHOD.UPLOAD && data.storageFileUrl) {
            throw new ValidationError(
                'File storage URL should only be provided for UPLOAD input method',
            )
        }

        this.validateDriveFileId(data.driveFileId)
        this.validateStorageFileUrl(data.storageFileUrl)

        this.id = data.id
        this.driveFileId = data.driveFileId
        this.storageFileUrl = data.storageFileUrl
        this.inputMethod = data.inputMethod
        this.fileName = data.fileName
        this.fileExtension = data.fileExtension
        this.columns = data.columns
        this.thumbnailUrl = data.thumbnailUrl
    }

    update(data: Partial<Omit<DataSourceInput, 'id'>>) {
        if (data.inputMethod) this.inputMethod = data.inputMethod

        if (data.driveFileId) {
            this.validateDriveFileId(data.driveFileId)
            this.driveFileId = data.driveFileId
        }

        if (data.storageFileUrl) {
            this.validateStorageFileUrl(data.storageFileUrl)
            this.storageFileUrl = data.storageFileUrl
        }

        if (data.fileName) this.fileName = data.fileName
        if (data.fileExtension) this.fileExtension = data.fileExtension
        if (data.columns) this.columns = data.columns
        if (data.thumbnailUrl) this.thumbnailUrl = data.thumbnailUrl
    }

    private validateDriveFileId(driveFileId: string | null) {
        if (this.inputMethod === INPUT_METHOD.UPLOAD && driveFileId) {
            throw new ValidationError(
                'Drive file ID should not be provided for UPLOAD input method',
            )
        }
    }

    private validateStorageFileUrl(storageFileUrl: string | null) {
        if (this.inputMethod !== INPUT_METHOD.UPLOAD && storageFileUrl) {
            throw new ValidationError(
                'File storage URL should only be provided for UPLOAD input method',
            )
        }
    }

    getId() {
        return this.id
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
            id: this.id,
            driveFileId: this.driveFileId,
            storageFileUrl: this.storageFileUrl,
            inputMethod: this.inputMethod,
            fileName: this.fileName,
            fileExtension: this.fileExtension,
            columns: this.columns,
            thumbnailUrl: this.thumbnailUrl,
        }
    }
}
