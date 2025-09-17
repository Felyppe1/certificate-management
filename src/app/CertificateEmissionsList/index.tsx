import { Suspense } from 'react'
import { List } from './List'
import { CreationForm } from './CreationForm'

export function CertificateEmissionsList() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex gap-4">
                <h2 className="text-2xl font-bold">Emissões de certificados</h2>
                <CreationForm />

                {/* <Link href="/certificados/criar">
                </Link> */}
            </div>
            <Suspense fallback={<p>Carregando emissões de certificados...</p>}>
                <List />
            </Suspense>
        </div>
    )
}
