import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getCertificateEmissionsMetricsAction } from '@/backend/infrastructure/server-actions/get-certificate-emissions-metrics-action'
import { Metrics } from './Metrics'

export async function MetricsSection() {
    const metrics = await getCertificateEmissionsMetricsAction()

    const queryClient = new QueryClient()
    queryClient.setQueryData(queryKeys.certificateEmissionsMetrics(), metrics)

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Metrics />
        </HydrationBoundary>
    )
}
