import {
    DownloadFileInput,
    GoogleDriveGateway,
} from '@/backend/application/interfaces/google-drive-gateway'
import { ValidationError } from '@/backend/domain/error/validation-error'
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
            fields: 'id, name, mimeType, size, webViewLink, webContentLink',
        })

        let mimeType: 'docx' | 'pptx'

        if (
            file.data.mimeType ===
                'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
            file.data.mimeType === 'application/vnd.google-apps.presentation'
        ) {
            mimeType = 'pptx'
        } else if (
            file.data.mimeType === 'application/vnd.google-apps.document' ||
            file.data.mimeType ===
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            mimeType = 'docx'
        } else {
            throw new ValidationError('Unsupported file type')
        }

        return {
            name: file.data.name!,
            mimeType,
        }
    }

    async downloadFile({ fileId, mimeType }: DownloadFileInput) {
        const url =
            mimeType === 'docx'
                ? `https://docs.google.com/document/d/${fileId}/export?format=${mimeType}`
                : `https://docs.google.com/presentation/d/${fileId}/export?format=${mimeType}`

        const res = await fetch(url)

        if (!res.ok) {
            throw new Error('Erro ao baixar do Google Docs')
        }

        const buffer = Buffer.from(await res.arrayBuffer())

        return buffer
    }
}
