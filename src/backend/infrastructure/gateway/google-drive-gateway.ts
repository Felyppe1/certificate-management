import {
    DownloadFileInput,
    GetFileMetadataInput,
    IGoogleDriveGateway,
} from '@/backend/application/interfaces/igoogle-drive-gateway'
import { IGoogleAuthGateway } from '@/backend/application/interfaces/igoogle-auth-gateway'
import { FileUrlNotFoundError } from '@/backend/domain/error/file-url-not-found-error'
import { ValidationError } from '@/backend/domain/error/validation-error'
import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'
import { MIME_TYPES } from '@/types'
import { google } from 'googleapis'

export const MIME_TYPE_TO_EXTENSION: Record<
    string,
    TEMPLATE_FILE_EXTENSION | undefined
> = {
    [MIME_TYPES.PPTX]: TEMPLATE_FILE_EXTENSION.PPTX,
    [MIME_TYPES.GOOGLE_SLIDES]: TEMPLATE_FILE_EXTENSION.GOOGLE_SLIDES,
    [MIME_TYPES.GOOGLE_DOCS]: TEMPLATE_FILE_EXTENSION.GOOGLE_DOCS,
    [MIME_TYPES.DOCX]: TEMPLATE_FILE_EXTENSION.DOCX,
}

export class GoogleDriveGateway implements IGoogleDriveGateway {
    constructor(private readonly googleAuthGateway: IGoogleAuthGateway) {}

    async getFileMetadata(input: GetFileMetadataInput) {
        const oauth2Client =
            input.userAccessToken && input.userRefreshToken
                ? this.googleAuthGateway.getOAuth2ClientWithCredentials({
                      accessToken: input.userAccessToken,
                      refreshToken: input.userRefreshToken,
                  })
                : null

        const authClient = this.googleAuthGateway.getAuthClient()

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
                throw new ValidationError('File mime type not found')
            }

            const fileExtension = MIME_TYPE_TO_EXTENSION[mimeType]

            if (!fileExtension) {
                throw new ValidationError('Unsupported file type')
            }

            // TODO: check if I will still use it...
            // const thumbnailUrl = file.data.thumbnailLink ? file.data.thumbnailLink.replace(/=s220$/, '') : null
            const thumbnailUrl = null

            return {
                name: file.data.name!,
                fileExtension,
                thumbnailUrl,
            }
        } catch (error: any) {
            console.log(error)

            if (error instanceof ValidationError) {
                throw error
            }

            throw new FileUrlNotFoundError('File not found')
        }
    }

    async downloadFile({
        driveFileId,
        fileExtension,
        accessToken,
    }: DownloadFileInput) {
        const url =
            fileExtension === TEMPLATE_FILE_EXTENSION.DOCX ||
            fileExtension === TEMPLATE_FILE_EXTENSION.GOOGLE_DOCS
                ? `https://docs.google.com/document/d/${driveFileId}/export?format=docx`
                : `https://docs.google.com/presentation/d/${driveFileId}/export?format=pptx`

        const headers: Record<string, string> = {}
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`
        }

        const res = await fetch(url, { headers })

        if (!res.ok) {
            throw new Error('Error downloading file from Google Drive')
        }

        const buffer = Buffer.from(await res.arrayBuffer())

        return buffer
    }
}
