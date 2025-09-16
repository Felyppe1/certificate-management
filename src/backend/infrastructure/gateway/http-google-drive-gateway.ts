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

        console.log(file.data)

        let mimeType: TEMPLATE_FILE_EXTENSION

        if (
            file.data.mimeType ===
                'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
            file.data.mimeType === 'application/vnd.google-apps.presentation'
        ) {
            mimeType = TEMPLATE_FILE_EXTENSION.PPTX
        } else if (
            file.data.mimeType === 'application/vnd.google-apps.document' ||
            file.data.mimeType ===
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            mimeType = TEMPLATE_FILE_EXTENSION.DOCX
        } else {
            throw new ValidationError('Unsupported file type')
        }

        return {
            name: file.data.name!,
            mimeType,
        }
    }

    async downloadFile({ driveFileId, mimeType }: DownloadFileInput) {
        const url =
            mimeType === TEMPLATE_FILE_EXTENSION.DOCX
                ? `https://docs.google.com/document/d/${driveFileId}/export?format=${mimeType}`
                : `https://docs.google.com/presentation/d/${driveFileId}/export?format=${mimeType}`

        const res = await fetch(url)

        if (!res.ok) {
            throw new Error('Erro ao baixar do Google Docs')
        }

        const buffer = Buffer.from(await res.arrayBuffer())

        return buffer
    }
}
