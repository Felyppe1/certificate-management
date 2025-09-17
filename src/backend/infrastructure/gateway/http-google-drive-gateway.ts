import {
    DownloadFileInput,
    GoogleDriveGateway,
} from '@/backend/application/interfaces/google-drive-gateway'
import { ValidationError } from '@/backend/domain/error/validation-error'
import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'
import { google } from 'googleapis'

const auth = new google.auth.GoogleAuth({
    keyFile: 'application-sa.json',
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
})

const drive = google.drive({ version: 'v3', auth })

export class HttpGoogleDriveGateway implements GoogleDriveGateway {
    async getFileMetadata(fileId: string) {
        const file = await drive.files.get({
            fileId: fileId,
            fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink',
        })

        let fileExtension: TEMPLATE_FILE_EXTENSION

        if (
            file.data.mimeType ===
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ) {
            fileExtension = TEMPLATE_FILE_EXTENSION.PPTX
        } else if (
            file.data.mimeType === 'application/vnd.google-apps.presentation'
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
    }

    async downloadFile({ driveFileId, fileExtension }: DownloadFileInput) {
        const url =
            fileExtension === TEMPLATE_FILE_EXTENSION.DOCX ||
            fileExtension === TEMPLATE_FILE_EXTENSION.GOOGLE_DOCS
                ? `https://docs.google.com/document/d/${driveFileId}/export?format=docx`
                : `https://docs.google.com/presentation/d/${driveFileId}/export?format=pptx`

        const res = await fetch(url)

        if (!res.ok) {
            throw new Error('Error downloading file from Google Drive')
        }

        const buffer = Buffer.from(await res.arrayBuffer())

        return buffer
    }
}
