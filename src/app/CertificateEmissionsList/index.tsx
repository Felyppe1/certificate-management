import { Suspense } from 'react'
import { List } from './List'

export async function CertificateEmissionsList() {
    return (
        <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold">Emissões de certificados</h2>
            <Suspense fallback={<p>Carregando emissões de certificados...</p>}>
                <List />
            </Suspense>
        </div>
    )
}
