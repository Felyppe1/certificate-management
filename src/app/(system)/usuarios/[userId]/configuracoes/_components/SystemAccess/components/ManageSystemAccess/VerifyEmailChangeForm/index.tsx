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
import { confirmEmailChangeAction } from '@/backend/infrastructure/server-actions/confirm-email-change-action'
import { requestEmailChangeAction } from '@/backend/infrastructure/server-actions/request-email-change-action'
import { cancelEmailChangeAction } from '@/backend/infrastructure/server-actions/cancel-email-change-action'

interface VerifyEmailChangeFormProps {
    newEmail: string
    onSuccess: () => void
    onCancel: () => void
}

export function VerifyEmailChangeForm({
    newEmail,
    onSuccess,
    onCancel,
}: VerifyEmailChangeFormProps) {
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
            fd.append('code', code)
            const result = await confirmEmailChangeAction(null, fd)
            if (result?.success === false) throw result
            return result
        },
        onSuccess: () => onSuccess(),
        onError: (error: any) => {
            if (isRedirectError(error)) return
            if (error?.errorType === 'email-change-code-expired') {
                setError('Código expirado.')
                onCancel()
            } else if (error?.errorType === 'email-change-code-invalid') {
                setError('Código inválido. Tente novamente.')
            } else {
                setError('Ocorreu um erro.')
            }
        },
    })

    const resendMutation = useMutation({
        mutationFn: async () => {
            const fd = new FormData()
            fd.append('newEmail', newEmail)
            const result = await requestEmailChangeAction(null, fd)
            if (result?.success === false) throw result
            return result
        },
        onSuccess: () => {
            setResendSuccess(true)
            setResendCooldown(60)
            setCode('')
            setError(null)
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return
            setError('Erro ao reenviar. Tente novamente.')
        },
    })

    const cancelMutation = useMutation({
        mutationFn: async () => {
            const result = await cancelEmailChangeAction()
            if (result?.success === false) throw result
            return result
        },
        onSuccess: () => onCancel(),
        onError: (error: any) => {
            if (isRedirectError(error)) return
            setError('Erro ao cancelar. Tente novamente.')
        },
    })

    const handleSubmit = () => {
        if (code.length !== 6) return
        setError(null)
        verifyMutation.mutate(code)
    }

    const isPending =
        verifyMutation.isPending ||
        resendMutation.isPending ||
        cancelMutation.isPending

    return (
        <div className="space-y-4">
            <div className="flex justify-center">
                <InputOTP
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={code}
                    onChange={setCode}
                    onComplete={handleSubmit}
                    disabled={isPending}
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
                    onClick={() => {
                        setResendSuccess(false)
                        setError(null)
                        resendMutation.mutate()
                    }}
                    disabled={isPending || resendCooldown > 0}
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

            <div className="text-center">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelMutation.mutate()}
                    disabled={isPending}
                >
                    {cancelMutation.isPending && (
                        <Loader2 className="size-3 animate-spin" />
                    )}
                    Cancelar
                </Button>
            </div>
        </div>
    )
}
