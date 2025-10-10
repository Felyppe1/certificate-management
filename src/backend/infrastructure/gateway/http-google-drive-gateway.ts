import {
    DownloadFileInput,
    GetFileMetadataInput,
    IGoogleDriveGateway,
} from '@/backend/application/interfaces/igoogle-drive-gateway'
import { FileUrlNotFoundError } from '@/backend/domain/error/file-url-not-found-error'
import { ValidationError } from '@/backend/domain/error/validation-error'
import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2()

const googleAuth = new google.auth.GoogleAuth({
    keyFile: 'application-sa.json',
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
})

export class HttpGoogleDriveGateway implements IGoogleDriveGateway {
    async getFileMetadata(input: GetFileMetadataInput) {
        oauth2Client.setCredentials({
            access_token: input.userAccessToken,
            refresh_token: input.userRefreshToken,
        })

        const drive = google.drive({
            version: 'v3',
            auth: input.userAccessToken ? oauth2Client : googleAuth,
        })

        try {
            const file = await drive.files.get({
                supportsAllDrives: true,
                fileId: input.fileId,
                fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink',
            })

            console.log(file)

            let fileExtension: TEMPLATE_FILE_EXTENSION

            if (
                file.data.mimeType ===
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ) {
                fileExtension = TEMPLATE_FILE_EXTENSION.PPTX
            } else if (
                file.data.mimeType ===
                'application/vnd.google-apps.presentation'
            ) {
                fileExtension = TEMPLATE_FILE_EXTENSION.GOOGLE_SLIDES
            } else if (
                file.data.mimeType === 'application/vnd.google-apps.document'
            ) {
                fileExtension = TEMPLATE_FILE_EXTENSION.GOOGLE_DOCS
            } else if (
                file.data.mimeType ===
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ) {
                fileExtension = TEMPLATE_FILE_EXTENSION.DOCX
            } else {
                throw new ValidationError('Unsupported file type')
            }

            return {
                name: file.data.name!,
                fileExtension,
            }
        } catch (error: any) {
            console.log(error)

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
