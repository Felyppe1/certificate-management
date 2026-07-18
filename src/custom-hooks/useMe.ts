import { useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchMe } from '@/requests/client-side/fetchMe'

export function useMe() {
    const result = useSuspenseQuery({
        queryKey: queryKeys.me(),
        queryFn: fetchMe,
    })

    if (result.isError) {
        throw result.error
    }

    return result
}
