import { useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchCertificateEmissions } from '@/requests/client-side/fetchCertificateEmissions'

export function useCertificateEmissions(search: string) {
    const result = useSuspenseQuery({
        queryKey: queryKeys.certificateEmissions(search),
        queryFn: () => fetchCertificateEmissions(search),
    })

    if (result.isError) {
        throw result.error
    }

    return result
}
