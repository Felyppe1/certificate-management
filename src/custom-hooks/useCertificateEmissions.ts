import { useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchCertificateEmissions } from '@/requests/client-side/fetchCertificateEmissions'

interface UseCertificateEmissionsParams {
    search: string
    sort: string
    status: string
}

export function useCertificateEmissions({
    search,
    sort,
    status,
}: UseCertificateEmissionsParams) {
    const result = useSuspenseQuery({
        queryKey: queryKeys.certificateEmissions({ search, sort, status }),
        queryFn: () => fetchCertificateEmissions({ search, sort, status }),
    })

    if (result.isError) {
        throw result.error
    }

    return result
}
