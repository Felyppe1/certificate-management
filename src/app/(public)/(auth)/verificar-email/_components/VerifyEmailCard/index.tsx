'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { VerifyEmailForm } from '@/components/VerifyEmailForm'
import { LinkSystemToGoogleModal } from '@/components/LinkSystemToGoogleModal'

interface Props {
    email: string
    linking: boolean
}

export function VerifyEmailCard({ email, linking }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [showLinkingModal, setShowLinkingModal] = useState(false)

    useEffect(() => {
        window.history.replaceState({}, '', '/verificar-email')
    }, [])

    if (showLinkingModal) {
        return (
            <LinkSystemToGoogleModal
                email={email}
                onDismiss={() => {
                    startTransition(() => {
                        router.push('/')
                    })
                }}
            />
        )
    }

    return (
        <>
            <p className="font-semibold text-lg">Verificação do e-mail</p>
            <VerifyEmailForm
                email={email}
                isLoading={isPending}
                onSuccess={() => {
                    if (linking) {
                        setShowLinkingModal(true)
                    } else {
                        startTransition(() => {
                            router.push('/')
                        })
                    }
                }}
            />
        </>
    )
}
