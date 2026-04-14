'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { toast } from 'sonner'

function ToastContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    const error = searchParams.get('error')

    useEffect(() => {
        if (!error) return

        switch (error) {
            case 'insufficient-external-account-scopes':
                toast.error(
                    'Permissões insuficientes. Por favor, conceda todas as permissões solicitadas pelo Google.',
                )
                break
            case 'not-certificate-owner':
                toast.error('Você não tem permissão para ver o certificado.')
                break
            case 'missing-session':
            case 'session-not-found':
            case 'user-not-found':
                toast.error('Sessão inválida. Por favor, faça login novamente.')
                break
            case 'session-expired':
                toast.error('Sessão expirada. Por favor, faça login novamente.')
                break
            case 'unknown-error':
                toast.error('Ocorreu um erro desconhecido.')
                break
            default:
                return
        }

        const params = new URLSearchParams(searchParams.toString())
        params.delete('error')

        const query = params.toString()
        const cleanUrl = query ? `${pathname}?${query}` : pathname

        router.replace(cleanUrl)
    }, [error, pathname, searchParams, router])

    return null
}

export function Toast() {
    return (
        <Suspense fallback={null}>
            <ToastContent />
        </Suspense>
    )
}
