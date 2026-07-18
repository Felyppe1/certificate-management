import { useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchCertificateEmissionsMetrics } from '@/requests/client-side/fetchCertificateEmissionsMetrics'

export function useCertificateEmissionsMetrics() {
    const result = useSuspenseQuery({
        queryKey: queryKeys.certificateEmissionsMetrics(),
        queryFn: fetchCertificateEmissionsMetrics,
    })

    if (result.isError) {
        throw result.error
    }

    return result
}
