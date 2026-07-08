import { Suspense } from 'react'
import { List } from './List'
import { CreationForm } from './CreationForm'
import { Card, CardTitle } from '@/components/ui/card'
import { ListLoading } from './ListLoading'
import SearchBox from './SearchBox'

export function CertificateEmissionsList() {
    return (
        <Card className="gap-0">
            <div className="pb-6 sm:pb-8 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Minhas Emissões de Certificados</CardTitle>
                        {/* <CardDescription>
                            Todos os certificados criados por você
                        </CardDescription> */}
                    </div>

                    <div className="flex items-center gap-[3%] xs:gap-4">
                        <SearchBox />

                        <CreationForm />
                    </div>
                </div>
            </div>
            <Suspense fallback={<ListLoading />}>
                <List />
            </Suspense>
        </Card>
    )
}
