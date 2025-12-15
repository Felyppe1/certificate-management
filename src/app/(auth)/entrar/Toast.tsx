'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

interface ToastProps {
    error: string
}

export function Toast({ error }: ToastProps) {
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        console.log(error)
        if (error === 'insufficient-external-account-scopes') {
            toast.error(
                'Permissões insuficientes. Por favor, conceda todas as permissões solicitadas pelo Google.',
            )
        } else if (error === 'unknown-error') {
            toast.error(
                'Ocorreu um erro desconhecido durante o login. Por favor, tente novamente.',
            )
        }

        router.replace(pathname)
    }, [error, router, pathname])

    return null
}
