import { ValueObject } from './primitives/value-object'

export interface DataSourceFileInput {
    fileName: string
    driveFileId: string | null
    storageFileUrl: string | null
}

export class DataSourceFile extends ValueObject<DataSourceFile> {
    private readonly fileName: string
    private readonly driveFileId: string | null
    private readonly storageFileUrl: string | null

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
        this.driveFileId = data.driveFileId
        this.storageFileUrl = data.storageFileUrl
    }

    getName(): string {
        return this.fileName
    }

    getDriveFileId(): string | null {
        return this.driveFileId
    }

    getStorageFileUrl(): string | null {
        return this.storageFileUrl
    }

    equals(other: DataSourceFile): boolean {
        return (
            this.getName() === other.getName() &&
            this.getDriveFileId() === other.getDriveFileId() &&
            this.getStorageFileUrl() === other.getStorageFileUrl()
        )
    }

    serialize(): DataSourceFileInput {
        return {
            fileName: this.getName(),
            driveFileId: this.getDriveFileId(),
            storageFileUrl: this.getStorageFileUrl(),
        }
    }
}
