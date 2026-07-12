import { DataSourceColumnInput } from '@/backend/domain/data-source-column'
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
            columns: DataSourceColumnInput[]
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
