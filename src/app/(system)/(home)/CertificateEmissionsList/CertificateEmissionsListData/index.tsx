import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getCertificateEmissionsAction } from '@/backend/infrastructure/server-actions/get-all-certificate-emissions-action'
import { List } from './List'

interface CertificateEmissionsListDataProps {
    search: string
}

export async function CertificateEmissionsListData({
    search,
}: CertificateEmissionsListDataProps) {
    const result = await getCertificateEmissionsAction({ search })

    const queryClient = new QueryClient()
    queryClient.setQueryData(queryKeys.certificateEmissions(search), result)

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <List search={search} />
        </HydrationBoundary>
    )
}
