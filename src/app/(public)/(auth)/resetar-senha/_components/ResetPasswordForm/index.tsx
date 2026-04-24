'use client'

import { useState, useEffect, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { toast } from 'sonner'
import { validateResetPasswordCodeAction } from '@/backend/infrastructure/server-actions/valida-reset-password-code-action'
import { resetPasswordAction } from '@/backend/infrastructure/server-actions/reset-password-action'
import { requestPasswordResetAction } from '@/backend/infrastructure/server-actions/request-password-reset-action'

const newPasswordSchema = z
    .object({
        newPassword: z
            .string()
            .min(6, 'Senha deve ter pelo menos 6 caracteres')
            .max(100, 'Senha deve ter no máximo 100 caracteres'),
        confirmPassword: z.string(),
    })
    .refine(data => data.newPassword === data.confirmPassword, {
        message: 'As senhas não coincidem',
        path: ['confirmPassword'],
    })

type NewPasswordFormData = z.infer<typeof newPasswordSchema>

interface ResetPasswordFormProps {
    email: string
}

export function ResetPasswordForm({ email }: ResetPasswordFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [step, setStep] = useState<'code' | 'password'>('code')
    const [verifiedCode, setVerifiedCode] = useState('')
    const [code, setCode] = useState('')
    const [codeError, setCodeError] = useState<string | null>(null)
    const [resendCooldown, setResendCooldown] = useState(0)
    const [resendSuccess, setResendSuccess] = useState(false)

    useEffect(() => {
        window.history.replaceState({}, '', '/resetar-senha')
    }, [])

    useEffect(() => {
        if (resendCooldown <= 0) return
        const timer = setInterval(() => setResendCooldown(c => c - 1), 1000)
        return () => clearInterval(timer)
    }, [resendCooldown])

    const passwordForm = useForm<NewPasswordFormData>({
        resolver: zodResolver(newPasswordSchema),
    })

    const verifyMutation = useMutation({
        mutationFn: async (code: string) => {
            const fd = new FormData()
            fd.append('email', email)
            fd.append('code', code)
            const result = await validateResetPasswordCodeAction(null, fd)
            if (result?.success === false) throw result
            return result
        },
        onSuccess: () => {
            setVerifiedCode(code)
            setStep('password')
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return
            if (error?.errorType === 'reset-password-code-expired') {
                setCodeError('Código expirado. Reenvie um novo código.')
            } else if (error?.errorType === 'reset-password-code-invalid') {
                setCodeError('Código errado. Tente novamente.')
            } else {
                setCodeError('Ocorreu um erro.')
            }
        },
    })

    const resendMutation = useMutation({
        mutationFn: async () => {
            const fd = new FormData()
            fd.append('email', email)
            const result = await requestPasswordResetAction(null, fd)
            if (result?.success === false) throw result
            return result
        },
        onSuccess: () => {
            setResendSuccess(true)
            setResendCooldown(60)
            setCode('')
            setCodeError(null)
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return
            setCodeError('Erro ao reenviar. Tente novamente.')
        },
    })

    const resetMutation = useMutation({
        mutationFn: async (data: NewPasswordFormData) => {
            const fd = new FormData()
            fd.append('email', email)
            fd.append('code', verifiedCode)
            fd.append('newPassword', data.newPassword)
            const result = await resetPasswordAction(null, fd)
            if (result?.success === false) throw result
            return result
        },
        onSuccess: () => {
            startTransition(() => {
                router.push('/entrar')
            })
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return
            if (error?.errorType === 'reset-password-code-expired') {
                toast.error('Código expirado. Solicite um novo código.')
                setStep('code')
                setVerifiedCode('')
                setCode('')
            } else {
                passwordForm.setError('root', {
                    message: 'Ocorreu um erro inesperado. Tente novamente.',
                })
            }
        },
    })

    const handleVerify = () => {
        if (code.length !== 6) return
        setCodeError(null)
        verifyMutation.mutate(code)
    }

    if (step === 'code') {
        return (
            <div className="space-y-4">
                <p className="font-semibold text-lg">Validação do código</p>
                <p className="text-sm text-muted-foreground">
                    Insira o código enviado para{' '}
                    <span className="font-medium text-foreground">{email}</span>
                </p>

                <div className="flex justify-center">
                    <InputOTP
                        maxLength={6}
                        pattern={REGEXP_ONLY_DIGITS}
                        value={code}
                        onChange={setCode}
                        onComplete={handleVerify}
                    >
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                </div>

                {codeError && (
                    <p className="text-sm text-destructive text-center">
                        {codeError}
                    </p>
                )}

                {resendSuccess && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center">
                        Código reenviado!
                    </p>
                )}

                <Button
                    type="button"
                    onClick={handleVerify}
                    disabled={code.length !== 6 || verifyMutation.isPending}
                    className="w-full"
                    size="lg"
                >
                    {verifyMutation.isPending && (
                        <Loader2 className="animate-spin" />
                    )}
                    Verificar
                </Button>

                <div className="text-center">
                    <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => resendMutation.mutate()}
                        disabled={
                            resendMutation.isPending || resendCooldown > 0
                        }
                        className="text-muted-foreground"
                    >
                        {resendMutation.isPending && (
                            <Loader2 className="size-3 animate-spin" />
                        )}
                        {resendCooldown > 0
                            ? `Reenviar em ${resendCooldown}s`
                            : 'Reenviar código'}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <form
            onSubmit={passwordForm.handleSubmit(data =>
                resetMutation.mutate(data),
            )}
            className="space-y-4"
        >
            <p className="text-sm text-muted-foreground">
                Defina sua nova senha para{' '}
                <span className="font-medium text-foreground">{email}</span>
            </p>

            <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    disabled={resetMutation.isPending || isPending}
                    {...passwordForm.register('newPassword')}
                    aria-invalid={!!passwordForm.formState.errors.newPassword}
                />
                {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">
                        {passwordForm.formState.errors.newPassword.message}
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    disabled={resetMutation.isPending || isPending}
                    {...passwordForm.register('confirmPassword')}
                    aria-invalid={
                        !!passwordForm.formState.errors.confirmPassword
                    }
                />
                {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                        {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                )}
            </div>

            {passwordForm.formState.errors.root && (
                <p className="text-sm text-destructive text-center">
                    {passwordForm.formState.errors.root.message}
                </p>
            )}

            <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={resetMutation.isPending || isPending}
            >
                {(resetMutation.isPending || isPending) && (
                    <Loader2 className="animate-spin" />
                )}
                Redefinir senha
            </Button>
        </form>
    )
}
