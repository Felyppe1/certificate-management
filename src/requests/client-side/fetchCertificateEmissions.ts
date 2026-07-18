import { GetCertificateEmissionsResponse } from '@/app/api/certificate-emissions/route'
import { ApiError } from '@/app/api/_utils/api-error'

interface FetchCertificateEmissionsParams {
    search: string
    sort: string
    status: string
}

export async function fetchCertificateEmissions({
    search,
    sort,
    status,
}: FetchCertificateEmissionsParams): Promise<GetCertificateEmissionsResponse> {
    const query = new URLSearchParams()
    if (search) query.set('search', search)
    if (sort) query.set('sort', sort)
    if (status) query.set('status', status)

    const response = await fetch(`/api/certificate-emissions?${query}`)

    const data = await response.json()

    if (!response.ok) {
        throw new ApiError(response.status, data)
    }

    return data
}
