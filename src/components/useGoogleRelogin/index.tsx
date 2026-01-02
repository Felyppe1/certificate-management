import { loginGoogleServerAction } from '@/backend/infrastructure/server-actions/login-google-server-action'
import { useGoogleLogin } from '@react-oauth/google'
import { startTransition, useActionState, useEffect } from 'react'
import { toast } from 'sonner'

interface UseGoogleReloginProps {
    userEmail: string
}

export function useGoogleRelogin({ userEmail }: UseGoogleReloginProps) {
    const [loginState, loginAction, loginIsLoading] = useActionState(
        loginGoogleServerAction,
        null,
    )

    const login = useGoogleLogin({
        flow: 'auth-code',
        scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.readonly',
        ].join(' '),
        hint: userEmail,
        onSuccess: async codeResponse => {
            console.log(codeResponse)

            const formData = new FormData()
            formData.append('code', codeResponse.code)

            startTransition(() => {
                loginAction(formData)
            })
        },
        // onError: error => {
        //     console.error('Login Failed:', error)
        // },
        // onNonOAuthError: err => {
        // },
    })

    useEffect(() => {
        if (!loginState) return

        if (!loginState.success) {
            if (
                loginState.errorType === 'insufficient-external-account-scopes'
            ) {
                toast.error(
                    'Permissões insuficientes. Por favor, conceda todas as permissões solicitadas pelo Google.',
                )
            }
        }
    }, [loginState])

    return { login, isLoading: loginIsLoading }
}
