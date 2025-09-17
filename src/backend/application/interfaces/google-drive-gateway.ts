import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'

export interface DownloadFileInput {
    driveFileId: string
    fileExtension: TEMPLATE_FILE_EXTENSION
}

export interface GetFileMetadataOutput {
    name: string
    fileExtension: TEMPLATE_FILE_EXTENSION
}

export interface GoogleDriveGateway {
    getFileMetadata(fileId: string): Promise<GetFileMetadataOutput>
    downloadFile(data: DownloadFileInput): Promise<Buffer>
}
