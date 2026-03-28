import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { CertificateEmissionsResponse } from '@/api-calls/fetch-certificate-emissions'

async function fetchCertificateEmissionsClient(): Promise<CertificateEmissionsResponse> {
    const response = await fetch('/api/certificate-emissions')

    if (!response.ok) {
        throw new Error('Failed to fetch certificate emissions')
    }

    return response.json()
}

export function useCertificateEmissions() {
    return useQuery({
        queryKey: queryKeys.certificateEmissions(),
        queryFn: fetchCertificateEmissionsClient,
    })
}
