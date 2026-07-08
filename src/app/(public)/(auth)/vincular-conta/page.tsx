import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Logo } from '@/components/Logo'
import { LinkGoogleConfirmCard } from './LinkGoogleConfirmCard'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Vincular conta',
}

export default async function VincularConta({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | undefined }>
}) {
    const params = await searchParams
    const email = params['email']

    if (!email) {
        redirect('/')
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <div className="w-full flex flex-col items-center space-y-8">
                <Logo className="w-34 sm:w-40 shrink-0" />
                <LinkGoogleConfirmCard systemUserEmail={email} />
            </div>
        </div>
    )
}
