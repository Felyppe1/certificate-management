import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'
import {
    CERTIFICATE_EMISSION_SORT_FIELDS,
    CertificateEmissionSortCriteria,
} from '@/backend/application/interfaces/repository/read/icertificate-emissions-read-repository'

export function parseCertificateEmissionsSort(
    raw: string | null | undefined,
): CertificateEmissionSortCriteria | undefined {
    if (!raw) return undefined

    const [field, order] = raw.split(':')
    const isValidField = (
        CERTIFICATE_EMISSION_SORT_FIELDS as readonly string[]
    ).includes(field)
    const isValidOrder = order === 'asc' || order === 'desc'

    if (!isValidField || !isValidOrder) return undefined

    return {
        field: field as CertificateEmissionSortCriteria['field'],
        order,
    }
}

export function parseCertificateEmissionsStatuses(
    raw: string | null | undefined,
): CERTIFICATE_STATUS[] | undefined {
    if (!raw) return undefined

    const statuses = raw
        .split(',')
        .filter((value): value is CERTIFICATE_STATUS =>
            Object.values(CERTIFICATE_STATUS).includes(
                value as CERTIFICATE_STATUS,
            ),
        )

    return statuses.length ? statuses : undefined
}
