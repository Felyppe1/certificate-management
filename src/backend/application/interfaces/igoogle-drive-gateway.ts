export interface DownloadFileInput {
    driveFileId: string
    fileExtension: string
    accessToken?: string
}

export interface GetFileMetadataInput {
    fileId: string
    userAccessToken?: string
    userRefreshToken?: string
}

export interface GetFileMetadataOutput {
    name: string
    fileExtension: string
    thumbnailUrl: string | null
}

export interface IGoogleDriveGateway {
    getFileMetadata(input: GetFileMetadataInput): Promise<GetFileMetadataOutput>
    downloadFile(data: DownloadFileInput): Promise<Buffer>
}
