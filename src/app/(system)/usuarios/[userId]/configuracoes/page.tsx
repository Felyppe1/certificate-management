import Link from 'next/link'
import { DeleteAccount } from './_components/DeleteAccount'
import { GrantAccess } from './_components/GrantAccess'
import { GoBackButton } from '@/components/GoBackButton'
import { SystemAccess } from './_components/SystemAccess'
import { Account } from './_components/Account'
import { BasicData } from './_components/BasicData'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Configurações',
}

export default function UserConfigurationsPage() {
    return (
        <>
            <div className="mb-8 px-2">
                <GoBackButton />

                <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                    Configurações
                </h1>
            </div>

            <div className="max-w-3xl space-y-6">
                <GrantAccess />

                <BasicData />

                <SystemAccess />

                <Account />

                <DeleteAccount />

                <div className="text-center text-sm text-muted-foreground">
                    Ao utilizar o Certifica, você concorda com nossos{' '}
                    <Link
                        href="/termos-de-servico"
                        target="_blank __noopener noreferrer"
                        className="text-primary hover:underline"
                    >
                        Termos de Serviço
                    </Link>{' '}
                    e{' '}
                    <Link
                        href="/politicas-de-privacidade"
                        target="_blank __noopener noreferrer"
                        className="text-primary hover:underline"
                    >
                        Política de Privacidade
                    </Link>
                    .
                </div>
            </div>
        </>
    )
}
