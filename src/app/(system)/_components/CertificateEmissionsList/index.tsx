import { Suspense } from 'react'
import { List } from './List'
import { CreationForm } from './CreationForm'
import { Card } from '@/components/ui/card'
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group'
import { Search } from 'lucide-react'

export function CertificateEmissionsList() {
    return (
        <Card className="gap-0">
            <div className="pb-8 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-foreground mb-2">
                            Minhas Emissões de Certificados
                        </h2>
                        <p className="">
                            Todos os certificados criados por você
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <InputGroup>
                            <InputGroupAddon>
                                <Search className="size-5 text-muted-foreground" />
                            </InputGroupAddon>
                            <InputGroupInput placeholder="Pesquisar emissão" />
                        </InputGroup>

                        <CreationForm />
                    </div>
                </div>
            </div>
            <Suspense fallback={<p>Carregando emissões de certificados...</p>}>
                <List />
            </Suspense>
        </Card>
    )
}
