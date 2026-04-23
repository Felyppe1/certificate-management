import { QueryClient, QueryKey } from '@tanstack/react-query'
import { redirect } from 'next/navigation'

interface ErrorResponse {
    statusCode: number
    body: {
        type?: string
    }
}

export async function prefetchOrRedirect(
    queryClient: QueryClient,
    options: { queryKey: QueryKey; queryFn: () => Promise<any> },
) {
    await queryClient.prefetchQuery<any, ErrorResponse>(options)

    const error = queryClient.getQueryState<any, ErrorResponse>(
        options.queryKey,
    )?.error

    const errorType = error?.body.type

    const params = new URLSearchParams()
    if (errorType) params.set('error', errorType)

    if (error?.statusCode === 403) {
        redirect(`/?${params.toString()}`)
    }

    if (error?.statusCode === 401) {
        params.set('clearSession', 'true')
        redirect(`/entrar?${params.toString()}`)
    }
}
