import { ValueObject } from './primitives/value-object'

export interface DataSourceFileInput {
    fileName: string
    driveFileId: string | null
    storageFileUrl: string | null
}

export class DataSourceFile extends ValueObject<DataSourceFile> {
    private readonly fileName: string
    private readonly _driveFileId: string | null
    private readonly _storageFileUrl: string | null

    constructor(data: DataSourceFileInput) {
        super()

        if (!data.fileName) {
            throw new Error('DataSource file name is required')
        }

        if (!data.driveFileId && !data.storageFileUrl) {
            throw new Error(
                'Either driveFileId or storageFileUrl must be provided for DataSource file',
            )
        }

        if (data.driveFileId && data.storageFileUrl) {
            throw new Error(
                'driveFileId and storageFileUrl cannot both be provided for DataSource file',
            )
        }

        this.fileName = data.fileName
        this._driveFileId = data.driveFileId
        this._storageFileUrl = data.storageFileUrl
    }

    get name(): string {
        return this.fileName
    }

    get driveFileId(): string | null {
        return this._driveFileId
    }

    get storageFileUrl(): string | null {
        return this._storageFileUrl
    }

    equals(other: DataSourceFile): boolean {
        return (
            this.name === other.name &&
            this.driveFileId === other.driveFileId &&
            this.storageFileUrl === other.storageFileUrl
        )
    }

    serialize(): DataSourceFileInput {
        return {
            fileName: this.name,
            driveFileId: this.driveFileId,
            storageFileUrl: this.storageFileUrl,
        }
    }
}
