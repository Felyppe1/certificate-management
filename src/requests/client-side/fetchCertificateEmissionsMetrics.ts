import { GetCertificateEmissionsMetricsResponse } from '@/app/api/certificate-emissions/metrics/route'
import { ApiError } from '@/app/api/_utils/api-error'

export async function fetchCertificateEmissionsMetrics(): Promise<GetCertificateEmissionsMetricsResponse> {
    const response = await fetch('/api/certificate-emissions/metrics')

    const data = await response.json()

    if (!response.ok) {
        throw new ApiError(response.status, data)
    }

    return data
}
