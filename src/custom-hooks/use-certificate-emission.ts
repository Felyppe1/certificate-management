import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { GetCertificateEmissionControllerResponse } from '@/app/api/certificate-emissions/[certificateEmissionId]/route'

async function fetchCertificateEmissionClient(
    certificateId: string,
): Promise<GetCertificateEmissionControllerResponse> {
    const response = await fetch(`/api/certificate-emissions/${certificateId}`)

    if (!response.ok) {
        throw new Error('Failed to fetch certificate emission')
    }

    return response.json()
}

export function useCertificateEmission(certificateId: string) {
    return useQuery({
        queryKey: queryKeys.certificateEmission(certificateId),
        queryFn: () => fetchCertificateEmissionClient(certificateId),
    })
}
