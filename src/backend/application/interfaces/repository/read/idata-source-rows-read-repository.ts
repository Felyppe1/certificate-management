import { PROCESSING_STATUS_ENUM } from '@/backend/domain/data-source-row'

export interface IDataSourceRowsReadRepository {
    getManyByCertificateEmissionId(
        certificateEmissionId: string,
        limit?: number,
        cursor?: string,
        statuses?: PROCESSING_STATUS_ENUM[],
    ): Promise<{
        data: {
            id: string
            data: Record<string, string>
        }[]
        nextCursor: string | null
    }>
    getAllRawByCertificateEmissionId(
        certificateEmissionId: string,
    ): Promise<{ id: string; data: Record<string, string> }[]>
    countByCertificateEmissionId(certificateEmissionId: string): Promise<number>

    countWithStatuses(
        certificateEmissionId: string,
        statuses: PROCESSING_STATUS_ENUM[],
    ): Promise<number>
}
