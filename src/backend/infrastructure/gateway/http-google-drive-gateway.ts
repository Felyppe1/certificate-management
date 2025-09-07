import {
    DownloadFileInput,
    GoogleDriveGateway,
} from '@/backend/application/interfaces/google-drive-gateway'

export class HttpGoogleDriveGateway implements GoogleDriveGateway {
    async downloadFile({ fileId, mimeType }: DownloadFileInput) {
        const url = `https://docs.google.com/document/d/${fileId}/export?format=${mimeType}`

        const res = await fetch(url)

        if (!res.ok) {
            throw new Error('Erro ao baixar do Google Docs')
        }

        const buffer = Buffer.from(await res.arrayBuffer())

        return buffer
    }
}
