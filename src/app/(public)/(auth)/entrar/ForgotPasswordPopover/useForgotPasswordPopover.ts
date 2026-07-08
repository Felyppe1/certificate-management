import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { requestPasswordResetAction } from '@/backend/infrastructure/server-actions/request-password-reset-action'

const schema = z.object({
    email: z.email('Formato de email inválido'),
})

type FormData = z.infer<typeof schema>

export function useForgotPasswordPopover() {
    const [isOpen, setIsOpen] = useState(false)
    const [isNavigating, startTransition] = useTransition()
    const router = useRouter()

    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { email: '' },
    })

    const mutation = useMutation({
        mutationFn: async (data: FormData) => {
            const formData = new FormData()
            formData.append('email', data.email)
            const result = await requestPasswordResetAction(null, formData)
            if (result?.success === false) throw result
            return { email: data.email }
        },
        onSuccess: ({ email }) => {
            // form.reset()
            startTransition(() => {
                router.push('/resetar-senha?email=' + encodeURIComponent(email))
            })
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return

            if (error?.errorType === 'system-login-not-enabled') {
                form.setError('email', {
                    message:
                        'Essa conta não possui senha. Use o login com Google.',
                })
            } else if (error?.errorType === 'user-not-found') {
                form.setError('email', {
                    message: 'Nenhuma conta encontrada com esse e-mail.',
                })
            } else {
                form.setError('email', {
                    message: 'Ocorreu um erro inesperado. Tente novamente.',
                })
            }
        },
    })

    return {
        isOpen,
        setIsOpen,
        form,
        onSubmit: form.handleSubmit(data => mutation.mutate(data)),
        isSubmitting: mutation.isPending || isNavigating,
        errors: form.formState.errors,
    }
}
