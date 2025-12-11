import { Suspense } from 'react'
import { List } from './components/List'
import { CreationForm } from './components/CreationForm'
import { Card, CardTitle } from '@/components/ui/card'
import { ListLoading } from './components/ListLoading'
import SearchBox from './components/SearchBox'

export function CertificateEmissionsList() {
    return (
        <Card className="gap-0">
            <div className="pb-8 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Minhas Emissões de Certificados</CardTitle>
                        {/* <CardDescription>
                            Todos os certificados criados por você
                        </CardDescription> */}
                    </div>

                    <div className="flex items-center gap-4">
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
