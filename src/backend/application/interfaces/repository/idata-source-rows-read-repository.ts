import { PROCESSING_STATUS_ENUM } from '@/backend/domain/data-source-row'

export interface IDataSourceRowsReadRepository {
    getManyByCertificateEmissionId(
        certificateEmissionId: string,
        limit?: number,
        cursor?: string,
    ): Promise<{
        data: {
            id: string
            data: Record<string, string>
        }[]
        nextCursor: string | null
    }>
    countByCertificateEmissionId(certificateEmissionId: string): Promise<number>

    countWithStatuses(
        certificateEmissionId: string,
        statuses: [PROCESSING_STATUS_ENUM],
    ): Promise<number>
}
