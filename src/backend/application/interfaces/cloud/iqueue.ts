import { DataSourceColumn } from '@/backend/domain/data-source'
import { TEMPLATE_FILE_EXTENSION } from '../../../domain/template'

export interface EnqueueGenerateCertificatePDFInput {
    certificateEmission: {
        id: string
        userId: string
        variableColumnMapping: Record<string, string | null> | null
        template: {
            storageFileUrl: string
            fileExtension: TEMPLATE_FILE_EXTENSION
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
    recipients: string[]
}

export interface IQueue {
    enqueueGenerateCertificatePDF(
        data: EnqueueGenerateCertificatePDFInput,
    ): Promise<void>
    enqueueSendCertificateEmails(
        data: EnqueueSendCertificateEmailsInput,
    ): Promise<void>
}
