import { Suspense } from 'react'
import { CertificateEmissionsList } from './CertificateEmissionsList'
import { MetricsSection } from './MetricsSection'
import { MetricsSkeleton } from './MetricsSection/MetricsSkeleton'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Início',
}

interface HomePageProps {
    searchParams: Promise<{ search?: string; sort?: string; status?: string }>
}

export default async function Home({ searchParams }: HomePageProps) {
    const { search, sort, status } = await searchParams

    return (
        <>
            <div className="mb-6 sm:mb-8 md:mb-10">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-4 text-foreground">
                    Dashboard
                </h1>
                <p className="text-foreground/90 text-sm sm:text-lg font-light">
                    Gerencie seus certificados e acompanhe estatísticas
                </p>
            </div>

            <Suspense fallback={<MetricsSkeleton />}>
                <MetricsSection />
            </Suspense>

            <CertificateEmissionsList
                search={search ?? ''}
                sort={sort ?? 'createdAt:desc'}
                status={status ?? ''}
            />
        </>
    )
}
