import {
    DownloadFileInput,
    GetFileMetadataInput,
    IGoogleDriveGateway,
} from '@/backend/application/interfaces/igoogle-drive-gateway'
import { IGoogleAuthGateway } from '@/backend/application/interfaces/igoogle-auth-gateway'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '@/backend/domain/error/validation-error'
import {
    MAX_TEMPLATE_BYTES_SIZE,
    TEMPLATE_FILE_MIME_TYPE,
} from '@/backend/domain/template'
import { google } from 'googleapis'
import {
    DATA_SOURCE_MIME_TYPE,
    MAX_DATA_SOURCE_BYTES_SIZE,
} from '@/backend/domain/data-source'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '@/backend/domain/error/not-found-error'

export class GoogleDriveGateway implements IGoogleDriveGateway {
    constructor(private readonly googleAuthGateway: IGoogleAuthGateway) {}

    async getFileMetadata(input: GetFileMetadataInput) {
        const oauth2Client = input.userAccessToken
            ? this.googleAuthGateway.getOAuth2ClientWithCredentials({
                  accessToken: input.userAccessToken,
                  refreshToken: input.userRefreshToken,
              })
            : null

        const authClient = this.googleAuthGateway.getAuthClient({
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        })

        const drive = google.drive({
            version: 'v3',
            auth: oauth2Client ?? authClient,
        })

        try {
            const file = await drive.files.get({
                supportsAllDrives: true,
                fileId: input.fileId,
                fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink',
            })

            const mimeType = file.data.mimeType

            if (!mimeType) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.MIMETYPE_MISSING,
                )
            }

            // TODO: check if I will still use it...
            // const thumbnailUrl = file.data.thumbnailLink ? file.data.thumbnailLink.replace(/=s220$/, '') : null
            const thumbnailUrl = null

            return {
                name: file.data.name!,
                fileMimeType: mimeType,
                thumbnailUrl,
            }
        } catch (error: any) {
            console.log(error)

            if (error instanceof ValidationError) {
                throw error
            }

            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DRIVE_FILE)
        }
    }

    async downloadFile({
        driveFileId,
        fileMimeType,
        accessToken,
    }: DownloadFileInput) {
        let url = ''
        let isTemplateFile = false

        // TODO: deveria exigir a tipagem dos dois ENUMS?
        switch (fileMimeType) {
            case TEMPLATE_FILE_MIME_TYPE.DOCX:
            case TEMPLATE_FILE_MIME_TYPE.GOOGLE_DOCS:
                isTemplateFile = true
                url = `https://docs.google.com/document/d/${driveFileId}/export?format=docx`
                break
            case TEMPLATE_FILE_MIME_TYPE.PPTX:
            case TEMPLATE_FILE_MIME_TYPE.GOOGLE_SLIDES:
                isTemplateFile = true
                url = `https://docs.google.com/presentation/d/${driveFileId}/export?format=pptx`
                break
            case DATA_SOURCE_MIME_TYPE.XLSX:
                url = `https://docs.google.com/spreadsheets/d/${driveFileId}/export?format=xlsx`
                break
            case DATA_SOURCE_MIME_TYPE.CSV:
            case DATA_SOURCE_MIME_TYPE.GOOGLE_SHEETS:
                url = `https://docs.google.com/spreadsheets/d/${driveFileId}/export?format=csv`
                break
            case DATA_SOURCE_MIME_TYPE.PNG:
            case DATA_SOURCE_MIME_TYPE.JPEG:
                url = accessToken
                    ? `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`
                    : `https://drive.google.com/uc?export=download&id=${driveFileId}`
                break
            default:
                throw new Error('Unsupported file extension for download')
        }

        const headers: Record<string, string> = {}
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`
        }

        const res = await fetch(url, { headers })

        if (!res.ok) {
            throw new Error('Error downloading file from Google Drive')
        }

        // 1. Try blocking it by headers (if it is present)
        const contentLength = res.headers.get('content-length')
            ? parseInt(res.headers.get('content-length')!, 10)
            : null
        if (contentLength) {
            if (isTemplateFile && contentLength > MAX_TEMPLATE_BYTES_SIZE) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.TEMPLATE_FILE_SIZE_TOO_LARGE,
                )
            }

            if (!isTemplateFile && contentLength > MAX_DATA_SOURCE_BYTES_SIZE) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.DATA_SOURCE_FILE_SIZE_TOO_LARGE,
                )
            }
        }

        if (!res.body) {
            throw new Error('The response body is empty.')
        }

        // 2. Read the file by streaming to ensure the limit is enforced in real-time
        const reader = res.body.getReader()
        const chunks: Uint8Array[] = []
        let downloadedSize = 0

        while (true) {
            const { done, value } = await reader.read()

            if (done) {
                break
            }

            if (value) {
                downloadedSize += value.length

                // If the file size exceeds the limit during download, cancel immediately
                if (
                    isTemplateFile &&
                    downloadedSize > MAX_TEMPLATE_BYTES_SIZE
                ) {
                    await reader.cancel()
                    throw new ValidationError(
                        VALIDATION_ERROR_TYPE.TEMPLATE_FILE_SIZE_TOO_LARGE,
                    )
                }
                if (
                    !isTemplateFile &&
                    downloadedSize > MAX_DATA_SOURCE_BYTES_SIZE
                ) {
                    await reader.cancel()
                    throw new ValidationError(
                        VALIDATION_ERROR_TYPE.DATA_SOURCE_FILE_SIZE_TOO_LARGE,
                    )
                }

                chunks.push(value)
            }
        }

        // Transform the chunks into a final Buffer
        const buffer = Buffer.concat(chunks)

        return buffer
    }
}
