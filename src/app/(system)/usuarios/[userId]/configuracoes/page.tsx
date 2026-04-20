import Link from 'next/link'
import { fetchMe } from '@/api-calls/fetch-me'
import { DeleteAccount } from './_components/DeleteAccount'
import { GrantAccess } from './_components/GrantAccess'
import { GoBackButton } from '@/components/GoBackButton'
import { SystemAccess } from './_components/SystemAccess'
import { Account } from './_components/Account'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Configurações',
}

export default async function UserConfigurationsPage() {
    const data = await fetchMe()

    return (
        <>
            <div className="mb-8 px-2">
                <GoBackButton />

                <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                    Configurações
                </h1>
            </div>

            <div className="max-w-3xl space-y-6">
                {(data.user.email == 'felyppe.nunes1@gmail.com' ||
                    data.user.email == 'luizfelyppe@id.uff.br') && (
                    <GrantAccess />
                )}

                <SystemAccess
                    email={data.user.email}
                    isEmailVerified={data.user.isEmailVerified}
                />

                <Account
                    externalAccounts={data.user.externalAccounts}
                    email={data.user.email}
                    isEmailVerified={data.user.isEmailVerified}
                />

                <DeleteAccount userEmail={data.user.email ?? ''} />

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
