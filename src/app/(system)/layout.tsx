import { fetchMe } from '@/api-calls/fetch-me'
import { Header } from './_components/Header'
import { Toast } from '@/components/Toast'
import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export const dynamic = 'force-dynamic'

interface SystemLayoutProps {
    children: React.ReactNode
}

export default async function Layout({ children }: SystemLayoutProps) {
    const queryClient = new QueryClient()

    await queryClient.prefetchQuery({
        queryKey: queryKeys.me(),
        queryFn: fetchMe,
    })

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Toast />
            <Header />

            <div className="flex flex-col justify-center min-h-screen bg-background pt-25 sm:pt-30 px-3 xs:px-10 pb-20 relative z-10">
                <div className="w-full max-w-7xl mx-auto">{children}</div>

                <div className="fixed top-32 left-[8%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none -z-1 animate-float"></div>
                <div className="fixed top-[35%] right-[5%] w-80 h-80 bg-purple-600/25 rounded-full blur-3xl pointer-events-none -z-1 animate-float-delayed"></div>
                <div className="fixed bottom-[20%] left-[30%] w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none -z-1 animate-float-slow"></div>
                <div className="fixed top-[55%] right-[28%] w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none -z-1 animate-float-reverse"></div>
                <div className="fixed bottom-10 right-[8%] w-88 h-88 bg-violet-600/20 rounded-full blur-3xl pointer-events-none -z-1 animate-float-wide"></div>
            </div>
        </HydrationBoundary>
    )
}
