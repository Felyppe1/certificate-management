import { useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { GetCertificateEmissionsResponse } from '@/app/api/certificate-emissions/route'
import { ApiError } from '@/app/api/_utils/api-error'

async function fetchCertificateEmissionsClient(): Promise<GetCertificateEmissionsResponse> {
    const response = await fetch('/api/certificate-emissions')

    const data = await response.json()

    if (!response.ok) {
        throw new ApiError(response.status, data)
    }

    return data
}

export function useCertificateEmissions() {
    const result = useSuspenseQuery({
        queryKey: queryKeys.certificateEmissions(),
        queryFn: fetchCertificateEmissionsClient,
    })

    if (result.isError) {
        throw result.error
    }

    return result
}
