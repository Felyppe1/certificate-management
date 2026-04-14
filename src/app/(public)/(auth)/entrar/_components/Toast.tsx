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
        switch (error) {
            case 'insufficient-external-account-scopes':
                toast.error(
                    'Permissões insuficientes. Por favor, conceda todas as permissões solicitadas pelo Google.',
                )
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
                toast.error(
                    'Ocorreu um erro desconhecido durante o login. Por favor, tente novamente.',
                )
        }
        // } else if (error === 'missing-session' ||
        //         error === 'session-not-found' ||
        //         error === 'user-not-found') {
        //     toast.error(
        //         'Ocorreu um erro desconhecido durante o login. Por favor, tente novamente.',
        //     )
        // } else if (error === 'unknown-error') {
        //     toast.error(
        //         'Ocorreu um erro desconhecido durante o login. Por favor, tente novamente.',
        //     )
        // }

        router.replace(pathname)
    }, [error, router, pathname])

    return null
}
