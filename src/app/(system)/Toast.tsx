'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

const ERROR_MESSAGES: Record<string, string> = {
    'insufficient-external-account-scopes':
        'Permissões insuficientes. Por favor, conceda todas as permissões solicitadas pelo Google.',
    'not-certificate-owner': 'Você não tem permissão para ver o certificado.',
}

export function Toast() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    const error = searchParams.get('error')

    useEffect(() => {
        if (error && ERROR_MESSAGES[error]) {
            toast.error(ERROR_MESSAGES[error])

            const params = new URLSearchParams(searchParams.toString())
            params.delete('error')

            const query = params.toString()
            const cleanUrl = query ? `${pathname}?${query}` : pathname

            router.replace(cleanUrl)
        }
    }, [pathname])

    return null
}
