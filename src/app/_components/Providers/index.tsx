'use client'

import {
    QueryCache,
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
    const router = useRouter()

    const isRedirectingRef = useRef(false) // TODO: probably remove

    const [queryClient] = useState(
        () =>
            new QueryClient({
                queryCache: new QueryCache({
                    onError: (error: any) => {
                        const status = error?.status
                        const type =
                            error?.type !== 'about:blank' ? error?.type : null
                        const query = type ? `?error=${type}` : ''

                        if (status === 401) {
                            isRedirectingRef.current = true
                            router.replace(`/entrar${query}`)
                        } else if (status === 403) {
                            isRedirectingRef.current = true
                            router.replace(`/${query}`)
                        }

                        throw error
                    },
                }),
                defaultOptions: {
                    queries: {
                        throwOnError: true,
                        staleTime: 60 * 1000,
                        retry: (failureCount, error: any) => {
                            if ([401, 403, 404].includes(error?.statusCode))
                                return false

                            return failureCount < 2
                        },
                    },
                },
            }),
    )

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    )
}
