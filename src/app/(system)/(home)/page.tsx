import { CertificateEmissionsList } from './_components/CertificateEmissionsList'
import { Metrics } from './_components/Metrics'
import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { Metadata } from 'next'
import { getCertificateEmissionsAction } from '@/backend/infrastructure/server-actions/get-all-certificate-emissions-action'
import { getCertificateEmissionsMetricsAction } from '@/backend/infrastructure/server-actions/get-certificate-emissions-metrics-action'

export const metadata: Metadata = {
    title: 'Início',
}

export default async function Home() {
    const queryClient = new QueryClient()

    const [certificateEmissionsResult, metrics] = await Promise.all([
        getCertificateEmissionsAction(),
        getCertificateEmissionsMetricsAction(),
    ])

    queryClient.setQueryData(
        queryKeys.certificateEmissions(),
        certificateEmissionsResult,
    )
    queryClient.setQueryData(queryKeys.certificateEmissionsMetrics(), metrics)

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <div className="mb-6 sm:mb-8 md:mb-10">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-4 text-foreground">
                    Dashboard
                </h1>
                <p className="text-foreground/90 text-sm sm:text-lg font-light">
                    Gerencie seus certificados e acompanhe estatísticas
                </p>
            </div>

            <Metrics />

            <CertificateEmissionsList />
        </HydrationBoundary>
    )
}
