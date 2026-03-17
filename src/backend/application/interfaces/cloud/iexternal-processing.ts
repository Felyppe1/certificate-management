import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'
import { GENERATION_STATUS } from '@/backend/domain/data-set'
import { DATA_SOURCE_MIME_TYPE } from '@/backend/domain/data-source'
import { INPUT_METHOD } from '../../../domain/certificate'
import { TEMPLATE_FILE_MIME_TYPE } from '../../../domain/template'

export interface TriggerGenerateCertificatePDFsInput {
    certificateEmission: {
        id: string
        name: string
        userId: string
        status: CERTIFICATE_STATUS
        createdAt: Date
        variableColumnMapping: Record<string, string | null> | null
        googleAccessToken: string | null
        template: {
            driveFileId: string | null
            storageFileUrl: string | null
            inputMethod: INPUT_METHOD
            fileName: string
            fileMimeType: TEMPLATE_FILE_MIME_TYPE
            variables: string[]
            thumbnailUrl: string | null
        }
        dataSource: {
            driveFileId: string | null
            storageFileUrl: string | null
            inputMethod: INPUT_METHOD
            fileName: string
            fileMimeType: DATA_SOURCE_MIME_TYPE
            columns: string[]
            thumbnailUrl: string | null
            dataSet: {
                id: string
                generationStatus: GENERATION_STATUS | null
                totalBytes: number
                rows: Record<string, any>[]
            }
        }
    }
}

export interface TriggerSendCertificateEmails {
    certificateEmissionId: string
    userId: string
    emailId: string
    sender: string
    subject: string
    body: string
    recipients: string[]
}

export interface IExternalProcessing {
    triggerGenerateCertificatePDFs(
        data: TriggerGenerateCertificatePDFsInput,
    ): Promise<void>
    triggerSendCertificateEmails(
        data: TriggerSendCertificateEmails,
    ): Promise<void>
}
