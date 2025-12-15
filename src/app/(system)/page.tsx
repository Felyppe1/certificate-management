import { CertificateEmissionsList } from './_components/CertificateEmissionsList'
import { Metrics } from './_components/Metrics'
import { Suspense } from 'react'
import { MetricsSkeleton } from './_components/Metrics/MetricsSkeleton'

export default function Home() {
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
                <Metrics />
            </Suspense>

            <CertificateEmissionsList />
        </>
    )
}
