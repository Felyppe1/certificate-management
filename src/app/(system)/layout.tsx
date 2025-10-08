import { fetchMe } from '@/api-calls/fetch-me'
import { Header } from './_components/Header'

interface SystemLayoutProps {
    children: React.ReactNode
}

export default async function Layout({ children }: SystemLayoutProps) {
    const data = await fetchMe()

    return (
        <>
            <Header userName={data.user.name} />

            <div className="min-h-screen bg-background pt-30 px-10 pb-20 relative z-10">
                <div className="max-w-7xl mx-auto">{children}</div>

                <div className="fixed top-40 right-20 w-96 h-96 bg-blue-600/30 rounded-full blur-3xl pointer-events-none -z-1 animate-float"></div>
                <div className="fixed bottom-40 left-20 w-80 h-80 bg-purple-600/30 rounded-full blur-3xl pointer-events-none -z-1 animate-float-delayed"></div>
            </div>
        </>
    )
}
