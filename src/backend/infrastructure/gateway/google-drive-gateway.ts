import {
    DownloadFileInput,
    GetFileMetadataInput,
    IGoogleDriveGateway,
    UploadFileInput,
} from '@/backend/application/interfaces/igoogle-drive-gateway'
import { IGoogleAuthGateway } from '@/backend/application/interfaces/igoogle-auth-gateway'
import { MimetypeMissingError } from '@/backend/domain/error/validation-error/mimetype-missing-error'
import { TemplateFileSizeTooLargeError } from '@/backend/domain/error/validation-error/template-file-size-too-large-error'
import { DataSourceFileSizeTooLargeError } from '@/backend/domain/error/validation-error/data-source-file-size-too-large-error'
import {
    MAX_TEMPLATE_BYTES_SIZE,
    TEMPLATE_FILE_MIME_TYPE,
} from '@/backend/domain/template'
import { google } from 'googleapis'
import {
    DATA_SOURCE_MIME_TYPE,
    MAX_DATA_SOURCE_BYTES_SIZE,
} from '@/backend/domain/data-source'
import { DriveFileNotFoundError } from '@/backend/domain/error/not-found-error/drive-file-not-found-error'

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
                throw new MimetypeMissingError()
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

            if (error instanceof MimetypeMissingError) {
                throw error
            }

            throw new DriveFileNotFoundError()
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
            case DATA_SOURCE_MIME_TYPE.GOOGLE_SHEETS:
                url = `https://docs.google.com/spreadsheets/d/${driveFileId}/export?format=csv`
                break
            case DATA_SOURCE_MIME_TYPE.CSV:
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
            console.log(await res.text())
            throw new Error('Error downloading file from Google Drive')
        }

        // 1. Try blocking it by headers (if it is present)
        const contentLength = res.headers.get('content-length')
            ? parseInt(res.headers.get('content-length')!, 10)
            : null
        if (contentLength) {
            if (isTemplateFile && contentLength > MAX_TEMPLATE_BYTES_SIZE) {
                throw new TemplateFileSizeTooLargeError()
            }

            if (!isTemplateFile && contentLength > MAX_DATA_SOURCE_BYTES_SIZE) {
                throw new DataSourceFileSizeTooLargeError()
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
                    throw new TemplateFileSizeTooLargeError()
                }
                if (
                    !isTemplateFile &&
                    downloadedSize > MAX_DATA_SOURCE_BYTES_SIZE
                ) {
                    await reader.cancel()
                    throw new DataSourceFileSizeTooLargeError()
                }

                chunks.push(value)
            }
        }

        // Transform the chunks into a final Buffer
        const buffer = Buffer.concat(chunks)

        return buffer
    }

    async uploadFile({
        buffer,
        mimeType,
        fileName,
        accessToken,
    }: UploadFileInput) {
        const oauth2Client =
            this.googleAuthGateway.getOAuth2ClientWithCredentials({
                accessToken,
                refreshToken: undefined,
            })

        const drive = google.drive({ version: 'v3', auth: oauth2Client })

        const { Readable } = await import('stream')

        let targetMimeType = mimeType
        switch (mimeType) {
            case DATA_SOURCE_MIME_TYPE.CSV:
            case DATA_SOURCE_MIME_TYPE.XLSX:
                targetMimeType = DATA_SOURCE_MIME_TYPE.GOOGLE_SHEETS
                break
            case TEMPLATE_FILE_MIME_TYPE.DOCX:
                targetMimeType = TEMPLATE_FILE_MIME_TYPE.GOOGLE_DOCS
                break
            case TEMPLATE_FILE_MIME_TYPE.PPTX:
                targetMimeType = TEMPLATE_FILE_MIME_TYPE.GOOGLE_SLIDES
        }

        const response = await drive.files.create({
            requestBody: {
                name: fileName,
                mimeType: targetMimeType,
            },
            media: {
                mimeType,
                body: Readable.from(buffer),
            },
            fields: 'id, webViewLink',
        })

        return {
            fileId: response.data.id!,
            webViewLink: response.data.webViewLink!,
        }
    }
}
