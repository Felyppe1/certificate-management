import { useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { notFound, redirect } from 'next/navigation'

async function fetchCertificateEmissionsMetricsClient() {
    const response = await fetch('/api/certificate-emissions/metrics')

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

export function useCertificateEmissionsMetrics() {
    return useSuspenseQuery({
        queryKey: queryKeys.certificateEmissionsMetrics(),
        queryFn: fetchCertificateEmissionsMetricsClient,
    })
}
