import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

async function fetchCertificateEmissionsMetricsClient() {
    const response = await fetch('/api/certificate-emissions/metrics')

    if (!response.ok) {
        throw new Error('Failed to fetch certificate emissions metrics')
    }

    return response.json()
}

export function useCertificateEmissionsMetrics() {
    return useQuery({
        queryKey: queryKeys.certificateEmissionsMetrics(),
        queryFn: fetchCertificateEmissionsMetricsClient,
    })
}
