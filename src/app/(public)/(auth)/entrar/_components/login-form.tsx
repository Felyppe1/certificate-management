'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Loader2, MailCheck } from 'lucide-react'
import { AlertMessage } from '@/components/ui/alert-message'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useTransition } from 'react'
import { loginAction } from '@/backend/infrastructure/server-actions/login-action'
import { resendVerificationEmailAction } from '@/backend/infrastructure/server-actions/resend-verification-email-action'

const loginSchema = z.object({
    email: z.email('Formato de email inválido'),
    password: z
        .string()
        .min(6, 'Senha deve ter pelo menos 6 caracteres')
        .max(100, 'Senha deve ter no máximo 100 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
    const [isPending, startTransition] = useTransition()
    const [isResendPending, startResendTransition] = useTransition()
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [emailNotVerified, setEmailNotVerified] = useState(false)
    const [resendSuccess, setResendSuccess] = useState(false)

    const {
        register,
        handleSubmit,
        getValues,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginFormData) => {
        setErrorMessage(null)
        setEmailNotVerified(false)
        setResendSuccess(false)

        startTransition(async () => {
            const formData = new FormData()
            formData.append('email', data.email)
            formData.append('password', data.password)

            const result = await loginAction(null, formData)

            if (result?.success === false) {
                if (result.errorType === 'incorrect-credentials') {
                    setErrorMessage('Email ou senha incorretos.')
                } else if (result.errorType === 'email-not-verified') {
                    setEmailNotVerified(true)
                } else {
                    setErrorMessage(
                        'Ocorreu um erro inesperado. Tente novamente.',
                    )
                }
            }
        })
    }

    const handleResendVerification = () => {
        setResendSuccess(false)
        startResendTransition(async () => {
            const formData = new FormData()
            formData.append('email', getValues('email'))
            const result = await resendVerificationEmailAction(null, formData)
            if (result?.success) {
                setResendSuccess(true)
            }
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errorMessage && (
                <AlertMessage
                    variant={'error'}
                    text={errorMessage}
                    icon={<AlertCircle className="" />}
                />
            )}

            {emailNotVerified && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-3">
                    <div className="flex gap-2 items-start">
                        <MailCheck className="size-4 mt-0.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <p className="text-sm text-amber-800 dark:text-amber-300">
                            Seu email ainda não foi verificado. Confira sua
                            caixa de entrada ou clique abaixo para reenviar.
                        </p>
                    </div>
                    {resendSuccess ? (
                        <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                            Email de verificação reenviado!
                        </p>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleResendVerification}
                            disabled={isResendPending}
                            className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/40"
                        >
                            {isResendPending && (
                                <Loader2 className="size-3 animate-spin" />
                            )}
                            Reenviar verificação
                        </Button>
                    )}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                    E-mail
                </Label>
                <Input
                    type="email"
                    id="email"
                    placeholder="nome@email.com"
                    {...register('email')}
                    aria-invalid={!!errors?.email}
                />
                {errors.email && (
                    <span className="text-sm text-destructive">
                        {errors.email.message}
                    </span>
                )}
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                        Senha
                    </Label>
                    <Link
                        href="/recuperar-senha"
                        className="text-sm font-semibold text-primary hover:underline"
                    >
                        Esqueceu a senha?
                    </Link>
                </div>
                <Input
                    type="password"
                    id="password"
                    placeholder="••••••••"
                    {...register('password')}
                    aria-invalid={!!errors?.password}
                />
                {errors.password && (
                    <span className="text-sm text-destructive">
                        {errors.password.message}
                    </span>
                )}
            </div>

            <Button
                type="submit"
                disabled={isPending}
                className="w-full"
                size="lg"
            >
                Entrar
                <ArrowRight />
            </Button>
        </form>
    )
}
