import { CERTIFICATE_STATUS, INPUT_METHOD } from '@/backend/domain/certificate'
import { DATA_SOURCE_MIME_TYPE } from '@/backend/domain/data-source'
import { TEMPLATE_FILE_MIME_TYPE } from '@/backend/domain/template'
import { ColumnType } from '@/backend/domain/data-source-column'
import {
    EMAIL_ERROR_TYPE_ENUM,
    PROCESSING_STATUS_ENUM,
} from '@/backend/domain/email'
import { PROCESSING_STATUS_ENUM as DATA_SOURCE_ROW_PROCESSING_STATUS_ENUM } from '@/backend/domain/data-source-row'

export interface CertificateEmissionListItemOutput {
    id: string
    name: string
    userId: string
    status: CERTIFICATE_STATUS
    createdAt: Date
}

export const CERTIFICATE_EMISSION_SORT_FIELDS = ['name', 'createdAt'] as const

export interface CertificateEmissionSortCriteria {
    field: (typeof CERTIFICATE_EMISSION_SORT_FIELDS)[number]
    order: 'asc' | 'desc'
}

export interface CertificateEmissionDetailsOutput {
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
        fileMimeType: TEMPLATE_FILE_MIME_TYPE
        variables: string[]
        thumbnailUrl: string | null
        googleAccountEmail: string | null
    } | null
    dataSource: {
        files: {
            fileName: string
            driveFileId: string | null
            storageFileUrl: string | null
        }[]
        inputMethod: INPUT_METHOD
        fileMimeType: DATA_SOURCE_MIME_TYPE
        columns: {
            name: string
            type: ColumnType
            arraySeparator: string | null
            arrayItemType: string | null
        }[]
        thumbnailUrl: string | null
        googleAccountEmail: string | null
        rows: {
            id: string
            processingStatus: DATA_SOURCE_ROW_PROCESSING_STATUS_ENUM
            fileBytes: number | null
            data: Record<string, string>
        }[]
    } | null
    email: {
        subject: string
        body: string
        scheduledAt: Date | null
        emailColumn: string
        emailErrorType: EMAIL_ERROR_TYPE_ENUM | null
        status: PROCESSING_STATUS_ENUM
    } | null
}

export interface GetCertificateEmissionsMetricsByUserIdOutput {
    totalCertificatesGenerated: number
    totalEmailsSent: number
    dailyCertificates: { date: Date; quantity: number }[]
    dailyEmails: { date: Date; quantity: number }[]
}

export interface ICertificateEmissionsReadRepository {
    listByOwner(
        userId: string,
        search?: string,
        sort?: CertificateEmissionSortCriteria,
        statuses?: CERTIFICATE_STATUS[],
    ): Promise<CertificateEmissionListItemOutput[]>
    getDetailsById(
        certificateId: string,
    ): Promise<CertificateEmissionDetailsOutput | null>
    getCertificateEmissionsMetricsByUserId(
        userId: string,
    ): Promise<GetCertificateEmissionsMetricsByUserIdOutput>
}
