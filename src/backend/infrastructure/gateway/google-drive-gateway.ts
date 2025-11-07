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
import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'
import { google } from 'googleapis'
import { DATA_SOURCE_FILE_EXTENSION } from '@/backend/domain/data-source'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '@/backend/domain/error/not-found-error'

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
                fileExtension: mimeType,
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
        fileExtension,
        accessToken,
    }: DownloadFileInput) {
        let url = ''

        // TODO: deveria exigir a tipagem dos dois ENUMS?
        switch (fileExtension) {
            case TEMPLATE_FILE_EXTENSION.DOCX:
            case TEMPLATE_FILE_EXTENSION.GOOGLE_DOCS:
                url = `https://docs.google.com/document/d/${driveFileId}/export?format=docx`
                break
            case TEMPLATE_FILE_EXTENSION.PPTX:
            case TEMPLATE_FILE_EXTENSION.GOOGLE_SLIDES:
                url = `https://docs.google.com/presentation/d/${driveFileId}/export?format=pptx`
                break
            case DATA_SOURCE_FILE_EXTENSION.XLSX:
                url = `https://docs.google.com/spreadsheets/d/${driveFileId}/export?format=xlsx`
                break
            case DATA_SOURCE_FILE_EXTENSION.CSV:
            case DATA_SOURCE_FILE_EXTENSION.GOOGLE_SHEETS:
                url = `https://docs.google.com/spreadsheets/d/${driveFileId}/export?format=csv`
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

        const buffer = Buffer.from(await res.arrayBuffer())

        return buffer
    }
}
