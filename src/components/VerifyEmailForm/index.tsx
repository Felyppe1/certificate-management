'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { verifyEmailAction } from '@/backend/infrastructure/server-actions/verify-email-action'
import { resendVerificationEmailAction } from '@/backend/infrastructure/server-actions/resend-verification-email-action'

interface VerifyEmailFormProps {
    email: string
    onSuccess?: () => void
    onCancel?: () => void
    isLoading?: boolean
}

export function VerifyEmailForm({
    email,
    onSuccess,
    onCancel,
    isLoading,
}: VerifyEmailFormProps) {
    const [code, setCode] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [resendCooldown, setResendCooldown] = useState(0)
    const [resendSuccess, setResendSuccess] = useState(false)

    useEffect(() => {
        if (resendCooldown <= 0) return
        const timer = setInterval(() => setResendCooldown(c => c - 1), 1000)
        return () => clearInterval(timer)
    }, [resendCooldown])

    const verifyMutation = useMutation({
        mutationFn: async (code: string) => {
            const fd = new FormData()
            fd.append('email', email)
            fd.append('code', code)
            const result = await verifyEmailAction(null, fd)
            if (result?.success === false) throw result
            return result
        },
        onSuccess: () => onSuccess?.(),
        onError: (error: any) => {
            if (isRedirectError(error)) return
            if (error?.errorType === 'verification-code-expired') {
                setError('Código expirado. Reenvie um novo código.')
            } else if (error?.errorType === 'verification-code-invalid') {
                setError('Código errado. Tente novamente.')
            } else {
                setError('Ocorreu um erro.')
            }
        },
    })

    const resendMutation = useMutation({
        mutationFn: async () => {
            const fd = new FormData()
            fd.append('email', email)
            const result = await resendVerificationEmailAction(null, fd)
            if (result?.success === false) throw result
            return result
        },
        onSuccess: () => {
            setResendSuccess(true)
            setResendCooldown(60)
            setCode('')
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return
            setError('Erro ao reenviar. Tente novamente.')
        },
    })

    const handleSubmit = () => {
        if (code.length !== 6) return
        setError(null)
        verifyMutation.mutate(code)
    }

    const handleResend = () => {
        setResendSuccess(false)
        setError(null)
        resendMutation.mutate()
    }

    return (
        <div className="space-y-4">
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
                    onComplete={handleSubmit}
                    disabled={isLoading || verifyMutation.isPending}
                    data-testid="verify-email-otp"
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

            {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
            )}

            {resendSuccess && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center">
                    Código reenviado!
                </p>
            )}

            <Button
                type="button"
                onClick={handleSubmit}
                disabled={
                    code.length !== 6 || verifyMutation.isPending || isLoading
                }
                className="w-full"
                size="lg"
                data-testid="verify-email-button"
            >
                {(verifyMutation.isPending || isLoading) && (
                    <Loader2 className="animate-spin" />
                )}
                Verificar
            </Button>

            <div className="text-center">
                <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={handleResend}
                    disabled={
                        resendMutation.isPending ||
                        resendCooldown > 0 ||
                        isLoading
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

            {onCancel && (
                <div className="text-center">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                </div>
            )}
        </div>
    )
}
