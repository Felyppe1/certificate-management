import { GetCertificateEmissionsResponse } from '@/app/api/certificate-emissions/route'
import { ApiError } from '@/app/api/_utils/api-error'

export async function fetchCertificateEmissions(
    search: string,
): Promise<GetCertificateEmissionsResponse> {
    const query = new URLSearchParams()
    if (search) query.set('search', search)

    const response = await fetch(`/api/certificate-emissions?${query}`)

    const data = await response.json()

    if (!response.ok) {
        throw new ApiError(response.status, data)
    }

    return data
}
