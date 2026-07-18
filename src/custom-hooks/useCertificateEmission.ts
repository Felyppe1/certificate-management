import { useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { ApiError } from '@/app/api/_utils/api-error'
import { notFound } from 'next/navigation'
import { fetchCertificateEmission } from '@/requests/client-side/fetchCertificateEmission'

export function useCertificateEmission(certificateId: string) {
    const result = useSuspenseQuery({
        queryKey: queryKeys.certificateEmission(certificateId),
        queryFn: () => fetchCertificateEmission(certificateId),
    })

    if (result.isError) {
        if (result.error instanceof ApiError) {
            if (result.error.status === 404) {
                notFound()
            }
        }

        throw result.error
    }

    return result
}
