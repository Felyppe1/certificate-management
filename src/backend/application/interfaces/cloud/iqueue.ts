import { DataSourceColumn } from '@/backend/domain/data-source'
import { TEMPLATE_FILE_MIME_TYPE } from '../../../domain/template'

export interface EnqueueGenerateCertificatePDFInput {
    certificateEmission: {
        id: string
        userId: string
        variableColumnMapping: Record<string, string | null> | null
        template: {
            storageFileUrl: string
            fileMimeType: TEMPLATE_FILE_MIME_TYPE
            variables: string[]
        }
        dataSource: {
            columns: DataSourceColumn[]
        }
    }
    row: {
        id: string
        data: Record<string, string>
    }
}

export interface EnqueueSendCertificateEmailsInput {
    certificateEmissionId: string
    userId: string
    emailId: string
    sender: string
    subject: string
    body: string
    recipients: { rowId: string; email: string }[]
}

export interface IQueue {
    enqueueGenerateCertificatePDF(
        data: EnqueueGenerateCertificatePDFInput,
    ): Promise<void>
    enqueueSendCertificateEmails(
        data: EnqueueSendCertificateEmailsInput,
    ): Promise<void>
}
