import { Suspense } from 'react'
import { List } from './List'
import { CreationForm } from './CreationForm'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group'
import { Search } from 'lucide-react'
import { CertificateEmissionsLoading } from '@/components/Loading/CertificateEmissionsLoading'

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
                        <InputGroup className="max-w-[20rem] w-full">
                            <InputGroupAddon>
                                <Search className="size-5 text-muted-foreground" />
                            </InputGroupAddon>
                            <InputGroupInput placeholder="Pesquisar emissão" />
                        </InputGroup>

                        <CreationForm />
                    </div>
                </div>
            </div>
            <Suspense fallback={<CertificateEmissionsLoading />}>
                <List />
            </Suspense>
        </Card>
    )
}
