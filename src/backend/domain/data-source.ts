import { INPUT_METHOD } from './certificate'

export enum DATA_SOURCE_FILE_EXTENSION {
    CSV = 'text/csv',
    XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ODS = 'application/vnd.oasis.opendocument.spreadsheet',
    GOOGLE_SHEETS = 'application/vnd.google-apps.spreadsheet',
}

export interface DataSourceInput {
    driveFileId: string | null
    storageFileUrl: string | null
    inputMethod: INPUT_METHOD
    fileName: string
    fileExtension: DATA_SOURCE_FILE_EXTENSION
    thumbnailUrl: string | null
    columns: string[]
}

export interface DataSourceOutput extends DataSourceInput {}

export interface CreateDataSourceInput extends DataSourceInput {}

// export interface UpdateDataSourceInput
//     extends Partial<Omit<DataSourceInput>> {}

export class DataSource {
    private driveFileId: string | null
    private storageFileUrl: string | null
    private inputMethod: INPUT_METHOD
    private fileName: string
    private fileExtension: DATA_SOURCE_FILE_EXTENSION
    private columns: string[]
    private thumbnailUrl: string | null

    constructor(data: DataSourceInput) {
        if (!data.inputMethod) {
            throw new Error('DataSource input method is required')
        }

        if (!data.columns) {
            throw new Error('DataSource columns is required')
        }

        if (!data.fileName) {
            // TODO: validate regex for file name
            throw new Error('DataSource file name is required')
        }

        if (!data.fileExtension) {
            throw new Error('DataSource file extension is required')
        }

        this.validateDriveFileId(data.driveFileId, data.inputMethod)
        this.validateStorageFileUrl(data.storageFileUrl, data.inputMethod)

        this.driveFileId = data.driveFileId
        this.storageFileUrl = data.storageFileUrl
        this.inputMethod = data.inputMethod
        this.fileName = data.fileName
        this.fileExtension = data.fileExtension
        this.columns = data.columns
        this.thumbnailUrl = data.thumbnailUrl
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
        return this.columns.includes(columnName)
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
        }
    }
}
