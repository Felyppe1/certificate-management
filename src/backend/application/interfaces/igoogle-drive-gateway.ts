export interface DownloadFileInput {
    driveFileId: string
    fileMimeType: string
    accessToken?: string
}

export interface GetFileMetadataInput {
    fileId: string
    userAccessToken?: string
    userRefreshToken?: string
}

export interface GetFileMetadataOutput {
    name: string
    fileMimeType: string
    thumbnailUrl: string | null
}

export interface UploadFileInput {
    buffer: Buffer
    mimeType: string
    fileName: string
    accessToken: string
}

export interface UploadFileOutput {
    fileId: string
    webViewLink: string
}

export interface IGoogleDriveGateway {
    getFileMetadata(input: GetFileMetadataInput): Promise<GetFileMetadataOutput>
    downloadFile(data: DownloadFileInput): Promise<Buffer>
    uploadFile(input: UploadFileInput): Promise<UploadFileOutput>
}
