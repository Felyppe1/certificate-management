import { fetchMe } from '@/api-calls/fetch-me'
import { fetchCertificateEmission } from '@/api-calls/fetch-certificate-emission'
import { CertificatePageClient } from './_components/CertificatePageClient'
import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export default async function CertificatePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id: certificateId } = await params

    const queryClient = new QueryClient()

    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: queryKeys.certificateEmission(certificateId),
            queryFn: () => fetchCertificateEmission(certificateId),
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.me(),
            queryFn: fetchMe,
        }),
    ])

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <CertificatePageClient certificateId={certificateId} />
        </HydrationBoundary>
    )
}
