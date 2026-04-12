import { useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { GetMeControllerResponse } from '@/app/api/users/me/route'
import { notFound, redirect } from 'next/navigation'

async function fetchMeClient(): Promise<GetMeControllerResponse> {
    const response = await fetch('/api/users/me')

    if (!response.ok) {
        const errorData = await response.json()

        const errorType =
            errorData.type !== 'about:blank' ? errorData.type : null

        if (response.status === 404) {
            notFound()
        }

        if (response.status === 403) {
            const query = errorType ? `?error=${errorType}` : ''
            redirect(`/${query}`)
        }

        if (response.status === 401) {
            const query = errorType ? `?error=${errorType}` : ''
            redirect(`/entrar${query}`)
        }

        throw {
            statusCode: response.status,
            body: errorData,
        }
    }

    return response.json()
}

export function useMe() {
    return useSuspenseQuery({
        queryKey: queryKeys.me(),
        queryFn: fetchMeClient,
    })
}
