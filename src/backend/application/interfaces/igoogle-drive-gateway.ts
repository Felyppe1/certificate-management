import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'

export interface DownloadFileInput {
    driveFileId: string
    fileExtension: TEMPLATE_FILE_EXTENSION
    accessToken?: string
}

export interface GetFileMetadataInput {
    fileId: string
    userAccessToken?: string
    userRefreshToken?: string
}

export interface GetFileMetadataOutput {
    name: string
    fileExtension: TEMPLATE_FILE_EXTENSION
}

export interface IGoogleDriveGateway {
    getFileMetadata(input: GetFileMetadataInput): Promise<GetFileMetadataOutput>
    downloadFile(data: DownloadFileInput): Promise<Buffer>
}
