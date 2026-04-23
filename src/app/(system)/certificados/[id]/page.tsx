import { fetchCertificateEmission } from '@/api-calls/fetch-certificate-emission'
import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { CertificatePageClient } from './_components/CertificatePageClient'
import { Metadata } from 'next'
import { prefetchOrRedirect } from '@/utils/prefetchOrRedirect'

export const metadata: Metadata = {
    title: 'Detalhes da Emissão',
}

export default async function CertificatePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id: certificateId } = await params

    const queryClient = new QueryClient()

    await prefetchOrRedirect(queryClient, {
        queryKey: queryKeys.certificateEmission(certificateId),
        queryFn: () => fetchCertificateEmission(certificateId),
    })

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <CertificatePageClient certificateId={certificateId} />
        </HydrationBoundary>
    )
}
