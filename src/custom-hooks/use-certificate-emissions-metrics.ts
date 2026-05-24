import { useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { GetCertificateEmissionsMetricsResponse } from '@/app/api/certificate-emissions/metrics/route'
import { ApiError } from '@/app/api/_utils/api-error'

async function fetchCertificateEmissionsMetricsClient(): Promise<GetCertificateEmissionsMetricsResponse> {
    const response = await fetch('/api/certificate-emissions/metrics')

    const data = await response.json()

    if (!response.ok) {
        throw new ApiError(response.status, data)
    }

    return data
}

export function useCertificateEmissionsMetrics() {
    const result = useSuspenseQuery({
        queryKey: queryKeys.certificateEmissionsMetrics(),
        queryFn: fetchCertificateEmissionsMetricsClient,
    })

    if (result.isError) {
        throw result.error
    }

    return result
}
