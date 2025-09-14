export interface DownloadFileInput {
    driveFileId: string
    mimeType: 'docx' | 'pptx'
}

export interface GetFileMetadataOutput {
    name: string
    mimeType: 'docx' | 'pptx'
}

export interface GoogleDriveGateway {
    getFileMetadata(fileId: string): Promise<GetFileMetadataOutput>
    downloadFile(data: DownloadFileInput): Promise<Buffer>
}
