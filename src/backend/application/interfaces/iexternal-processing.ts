import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'
import { GENERATION_STATUS } from '@/backend/domain/data-set'
import { DATA_SOURCE_FILE_EXTENSION } from '@/backend/domain/data-source'
import { INPUT_METHOD } from '../../domain/certificate'
import { TEMPLATE_FILE_EXTENSION } from '../../domain/template'

export interface TriggerGenerateCertificatePDFsInput {
    certificateEmission: {
        id: string
        name: string
        userId: string
        status: CERTIFICATE_STATUS
        createdAt: Date
        variableColumnMapping: Record<string, string | null> | null
        template: {
            driveFileId: string | null
            storageFileUrl: string | null
            inputMethod: INPUT_METHOD
            fileName: string
            fileExtension: TEMPLATE_FILE_EXTENSION
            variables: string[]
            thumbnailUrl: string | null
        }
        dataSource: {
            driveFileId: string | null
            storageFileUrl: string | null
            inputMethod: INPUT_METHOD
            fileName: string
            fileExtension: DATA_SOURCE_FILE_EXTENSION
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
    recipients: { recipient: string; index: number }[]
}

export interface IExternalProcessing {
    triggerGenerateCertificatePDFs(
        data: TriggerGenerateCertificatePDFsInput,
    ): Promise<void>
    triggerSendCertificateEmails(
        data: TriggerSendCertificateEmails,
    ): Promise<void>
}
