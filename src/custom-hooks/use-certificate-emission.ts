import { useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { GetCertificateEmissionResponse } from '@/app/api/certificate-emissions/[certificateEmissionId]/route'
import { ApiError } from '@/app/api/_utils/api-error'
import { notFound } from 'next/navigation'

async function fetchCertificateEmissionClient(
    certificateId: string,
): Promise<GetCertificateEmissionResponse> {
    const response = await fetch(`/api/certificate-emissions/${certificateId}`)

    const data = await response.json()

    if (!response.ok) {
        throw new ApiError(response.status, data)
    }

    return data
}

export function useCertificateEmission(certificateId: string) {
    const result = useSuspenseQuery({
        queryKey: queryKeys.certificateEmission(certificateId),
        queryFn: () => fetchCertificateEmissionClient(certificateId),
    })

    if (result.isError) {
        if (result.error instanceof ApiError) {
            if (result.error.statusCode === 404) {
                notFound()
            }
        }

        throw result.error
    }

    return result
}
