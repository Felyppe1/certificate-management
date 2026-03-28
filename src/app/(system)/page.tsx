import { CertificateEmissionsList } from './_components/CertificateEmissionsList'
import { Metrics } from './_components/Metrics'
import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchCertificateEmissions } from '@/api-calls/fetch-certificate-emissions'
import { fetchCertificateEmissionsMetricsByUser } from '@/api-calls/fetch-certificate-emissions-metrics-by-user'

export default async function Home() {
    const queryClient = new QueryClient()

    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: queryKeys.certificateEmissions(),
            queryFn: fetchCertificateEmissions,
        }),
        queryClient.prefetchQuery({
            queryKey: queryKeys.certificateEmissionsMetrics(),
            queryFn: fetchCertificateEmissionsMetricsByUser,
        }),
    ])

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
