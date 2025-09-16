import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'

export interface DownloadFileInput {
    driveFileId: string
    mimeType: TEMPLATE_FILE_EXTENSION.DOCX | TEMPLATE_FILE_EXTENSION.PPTX
}

export interface GetFileMetadataOutput {
    name: string
    mimeType: TEMPLATE_FILE_EXTENSION.DOCX | TEMPLATE_FILE_EXTENSION.PPTX
}

export interface GoogleDriveGateway {
    getFileMetadata(fileId: string): Promise<GetFileMetadataOutput>
    downloadFile(data: DownloadFileInput): Promise<Buffer>
}
