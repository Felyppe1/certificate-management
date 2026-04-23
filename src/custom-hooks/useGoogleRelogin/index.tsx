import { loginGoogleServerAction } from '@/backend/infrastructure/server-actions/login-google-server-action'
import { CodeResponse, useGoogleLogin } from '@react-oauth/google'
import { useState } from 'react'
import { toast } from 'sonner'

interface UseGoogleReloginProps {
    userEmail?: string
    onError?: (
        errorResponse: Pick<
            CodeResponse,
            'error' | 'error_description' | 'error_uri'
        >,
    ) => void
    onNonOAuthError?: (nonOAuthError: NonOAuthError) => void
    onSuccess?: () => void
}

type NonOAuthError = {
    type: string
}

export function useGoogleRelogin({
    userEmail,
    onError: customOnError,
    onNonOAuthError: customOnNonOAuthError,
    onSuccess: customOnSuccess,
}: UseGoogleReloginProps) {
    const [isLoading, setIsLoading] = useState(false)

    const login = useGoogleLogin({
        flow: 'auth-code',
        scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.readonly',
        ].join(' '),
        ...(userEmail ? { hint: userEmail } : {}),
        onSuccess: async codeResponse => {
            console.log(codeResponse)

            setIsLoading(true)

            try {
                const formData = new FormData()
                formData.append('code', codeResponse.code)

                const result = await loginGoogleServerAction(null, formData)

                if (result) {
                    if (result.success) {
                        customOnSuccess?.()
                    } else {
                        if (
                            result.errorType ===
                            'insufficient-external-account-scopes'
                        ) {
                            toast.error(
                                'Permissões insuficientes. Por favor, conceda todas as permissões solicitadas pelo Google.',
                            )
                        } else if (
                            result.errorType === 'google-account-email-mismatch'
                        ) {
                            toast.error(
                                'Não é possível reautenticar-se com um e-mail diferente.',
                            )
                        } else if (
                            result.errorType ===
                            'external-account-already-exists'
                        ) {
                            toast.error('Esta conta já está sendo usada')
                        } else {
                            toast.error(
                                'Falha ao autenticar com o Google. Tente novamente.',
                            )
                        }
                    }
                }
            } finally {
                setIsLoading(false)
            }
        },
        onError: error => {
            if (customOnError) {
                customOnError(error)
                return
            }

            console.error('Login Failed:', error)
        },
        onNonOAuthError: err => {
            if (customOnNonOAuthError) {
                customOnNonOAuthError(err)
                return
            }
        },
    })

    return {
        login,
        isLoading,
    }
}
