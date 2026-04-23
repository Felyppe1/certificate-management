import { fetchMe } from '@/api-calls/fetch-me'
import { Header } from './_components/Header'
import { Toast } from '@/components/Toast'
import { BackgroundBubbles } from '@/components/BackgroundBubbles'
import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { prefetchOrRedirect } from '@/utils/prefetchOrRedirect'

export const dynamic = 'force-dynamic'

interface SystemLayoutProps {
    children: React.ReactNode
}

export default async function Layout({ children }: SystemLayoutProps) {
    const queryClient = new QueryClient()

    await prefetchOrRedirect(queryClient, {
        queryKey: queryKeys.me(),
        queryFn: fetchMe,
    })

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Toast />
            <Header />

            <div className="flex flex-col justify-center min-h-screen bg-background pt-25 sm:pt-30 px-3 xs:px-10 pb-20 relative z-10">
                <div className="w-full max-w-7xl mx-auto">{children}</div>

                <BackgroundBubbles />
            </div>
        </HydrationBoundary>
    )
}
