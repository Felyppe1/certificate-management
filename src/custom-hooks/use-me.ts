import { useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { GetMeResponse } from '@/app/api/users/me/route'
import { ApiError } from '@/app/api/_utils/api-error'

async function fetchMeClient(): Promise<GetMeResponse> {
    const response = await fetch('/api/users/me')

    const data = await response.json()

    if (!response.ok) {
        throw new ApiError(response.status, data)
    }

    return data
}

export function useMe() {
    const result = useSuspenseQuery({
        queryKey: queryKeys.me(),
        queryFn: fetchMeClient,
    })

    if (result.isError) {
        throw result.error
    }

    return result
}
