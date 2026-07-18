import { Suspense } from 'react'
import { CertificateEmissionsListData } from './CertificateEmissionsListData'
import { CreationForm } from './CreationForm'
import { Card, CardTitle } from '@/components/ui/card'
import { ListLoading } from './ListLoading'
import SearchBox from './SearchBox'
import { SortSelect } from './SortSelect'
import { StatusFilter } from './StatusFilter'

interface CertificateEmissionsListProps {
    search: string
    sort: string
    status: string
}

export function CertificateEmissionsList({
    search,
    sort,
    status,
}: CertificateEmissionsListProps) {
    return (
        <Card className="gap-0">
            <div className="pb-6 sm:pb-8 border-b space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <CardTitle>Minhas Emissões de Certificados</CardTitle>
                    {/* <CardDescription>
                        Todos os certificados criados por você
                    </CardDescription> */}

                    <CreationForm />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <SearchBox search={search} />

                    <StatusFilter status={status} />

                    <SortSelect sort={sort} />
                </div>
            </div>
            <Suspense fallback={<ListLoading />}>
                <CertificateEmissionsListData
                    search={search}
                    sort={sort}
                    status={status}
                />
            </Suspense>
        </Card>
    )
}
