export interface DownloadFileInput {
    fileId: string
    mimeType: 'docx'
}

export interface GoogleDriveGateway {
    downloadFile(data: DownloadFileInput): Promise<Buffer>
}
