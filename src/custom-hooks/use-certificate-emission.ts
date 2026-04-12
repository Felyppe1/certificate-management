import { useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { GetCertificateEmissionControllerResponse } from '@/app/api/certificate-emissions/[certificateEmissionId]/route'
import { notFound, redirect } from 'next/navigation'

async function fetchCertificateEmissionClient(
    certificateId: string,
): Promise<GetCertificateEmissionControllerResponse> {
    const response = await fetch(`/api/certificate-emissions/${certificateId}`)

    if (!response.ok) {
        const errorData = await response.json()

        const errorType =
            errorData.type !== 'about:blank' ? errorData.type : null

        if (response.status === 404) {
            notFound()
        }

        if (response.status === 403) {
            const query = errorType ? `?error=${errorType}` : ''
            redirect(`/${query}`)
        }

        if (response.status === 401) {
            const query = errorType ? `?error=${errorType}` : ''
            redirect(`/entrar${query}`)
        }

        throw {
            statusCode: response.status,
            body: errorData,
        }
    }

    return response.json()
}

export function useCertificateEmission(certificateId: string) {
    return useSuspenseQuery({
        queryKey: queryKeys.certificateEmission(certificateId),
        queryFn: () => fetchCertificateEmissionClient(certificateId),
    })
}
