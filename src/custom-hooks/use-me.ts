import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { GetMeControllerResponse } from '@/app/api/users/me/route'

async function fetchMeClient(): Promise<GetMeControllerResponse> {
    const response = await fetch('/api/users/me')

    if (!response.ok) {
        throw new Error('Failed to fetch user')
    }

    return response.json()
}

export function useMe() {
    return useQuery({
        queryKey: queryKeys.me(),
        queryFn: fetchMeClient,
    })
}
