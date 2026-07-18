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
    sort: string
    status: string
}

export async function CertificateEmissionsListData({
    search,
    sort,
    status,
}: CertificateEmissionsListDataProps) {
    const result = await getCertificateEmissionsAction({ search, sort, status })

    const queryClient = new QueryClient()
    queryClient.setQueryData(
        queryKeys.certificateEmissions({ search, sort, status }),
        result,
    )

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <List search={search} sort={sort} status={status} />
        </HydrationBoundary>
    )
}
