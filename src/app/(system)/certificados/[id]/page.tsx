import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { CertificatePageClient } from './_components/CertificatePageClient'
import { Metadata } from 'next'
import { getCertificateEmissionAction } from '@/backend/infrastructure/server-actions/get-certificate-emission-action'

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

    const { certificateEmission } =
        await getCertificateEmissionAction(certificateId)

    queryClient.setQueryData(queryKeys.certificateEmission(certificateId), {
        certificateEmission,
    })

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <CertificatePageClient certificateId={certificateId} />
        </HydrationBoundary>
    )
}
