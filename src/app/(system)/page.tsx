import { CertificateEmissionsList } from './_components/CertificateEmissionsList'
import { Metrics } from './_components/Metrics'
import { Suspense } from 'react'
import { MetricsSkeleton } from './_components/Metrics/MetricsSkeleton'

export default function Home() {
    return (
        <>
            <div className="mb-12">
                <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                    Dashboard
                </h1>
                <p className="text-foreground/90 text-lg font-light">
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
