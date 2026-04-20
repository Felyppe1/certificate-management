'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { Loader2 } from 'lucide-react'
import { verifyEmailAction } from '@/backend/infrastructure/server-actions/verify-email-action'
import { resendVerificationEmailAction } from '@/backend/infrastructure/server-actions/resend-verification-email-action'

interface VerifyEmailFormProps {
    email: string
    onSuccess?: () => void
}

export function VerifyEmailForm({ email, onSuccess }: VerifyEmailFormProps) {
    const router = useRouter()
    const [code, setCode] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [isResendPending, startResendTransition] = useTransition()
    const [resendCooldown, setResendCooldown] = useState(0)
    const [resendSuccess, setResendSuccess] = useState(false)

    useEffect(() => {
        if (resendCooldown <= 0) return
        const timer = setInterval(() => setResendCooldown(c => c - 1), 1000)
        return () => clearInterval(timer)
    }, [resendCooldown])

    const handleSubmit = () => {
        if (code.length !== 6) return
        setError(null)
        startTransition(async () => {
            const fd = new FormData()
            fd.append('email', email)
            fd.append('code', code)
            const result = await verifyEmailAction(null, fd)
            if (result?.success) {
                onSuccess?.()
            } else if (result?.errorType === 'verification-code-expired') {
                setError('Código expirado. Reenvie um novo código.')
            } else if (result?.errorType === 'verification-code-invalid') {
                setError('Código errado. Tente novamente.')
            } else {
                setError('Ocorreu um erro.')
            }
        })
    }

    const handleResend = () => {
        setResendSuccess(false)
        setError(null)
        startResendTransition(async () => {
            const fd = new FormData()
            fd.append('email', email)
            const result = await resendVerificationEmailAction(null, fd)
            if (result?.success) {
                setResendSuccess(true)
                setResendCooldown(60)
                setCode('')
            } else {
                setError('Erro ao reenviar. Tente novamente.')
            }
        })
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
                disabled={code.length !== 6 || isPending}
                className="w-full"
                size="lg"
            >
                {isPending && <Loader2 className="animate-spin" />}
                Verificar
            </Button>

            <div className="text-center">
                <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={handleResend}
                    disabled={isResendPending || resendCooldown > 0}
                    className="text-muted-foreground"
                >
                    {isResendPending && (
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
