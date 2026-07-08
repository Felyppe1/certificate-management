import { cancelSystemLoginAction } from '@/backend/infrastructure/server-actions/cancel-system-login-action'
import { requestEmailChangeAction } from '@/backend/infrastructure/server-actions/request-email-change-action'
import { updateSystemPasswordAction } from '@/backend/infrastructure/server-actions/update-system-password-action'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { VerifyEmailForm } from '@/components/VerifyEmailForm'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import {
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    KeyRound,
    Loader2,
} from 'lucide-react'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import z from 'zod'
import { VerifyEmailChangeForm } from './VerifyEmailChangeForm'

const changeEmailSchema = z.object({
    newEmail: z.string().email('Formato de e-mail inválido'),
})

const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Campo obrigatório'),
        newPassword: z
            .string()
            .min(6, 'Mínimo de 6 caracteres')
            .max(100, 'Máximo de 100 caracteres'),
        confirmNewPassword: z.string(),
    })
    .refine(d => d.newPassword === d.confirmNewPassword, {
        message: 'As senhas não coincidem',
        path: ['confirmNewPassword'],
    })

type ChangeEmailData = z.infer<typeof changeEmailSchema>
type ChangePasswordData = z.infer<typeof changePasswordSchema>

export function ManageSystemAccess({
    email,
    isEmailVerified,
    emailChangeCode,
    onSuccess,
}: {
    email: string
    isEmailVerified: boolean
    emailChangeCode: { newEmail: string; expiresAt: Date } | null
    onSuccess: () => void
}) {
    const [showChangeEmail, setShowChangeEmail] = useState(false)
    const [showChangePassword, setShowChangePassword] = useState(false)

    const emailForm = useForm<ChangeEmailData>({
        resolver: zodResolver(changeEmailSchema),
    })
    const passwordForm = useForm<ChangePasswordData>({
        resolver: zodResolver(changePasswordSchema),
    })

    const requestEmailChangeMutation = useMutation({
        mutationFn: async (data: ChangeEmailData) => {
            const fd = new FormData()
            fd.append('newEmail', data.newEmail)
            const result = await requestEmailChangeAction(null, fd)
            if (result?.success === false) throw result
            return { newEmail: data.newEmail }
        },
        onSuccess: ({ newEmail }) => {
            setShowChangeEmail(false)
            emailForm.reset()
            toast.success(`Código enviado para ${newEmail}.`)
            onSuccess()
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return
            if (error?.errorType === 'email-unavailable') {
                toast.error('Este e-mail já está em uso.')
            } else {
                toast.error('Ocorreu um erro. Tente novamente.')
            }
        },
    })

    const changePasswordMutation = useMutation({
        mutationFn: async (data: ChangePasswordData) => {
            const fd = new FormData()
            fd.append('currentPassword', data.currentPassword)
            fd.append('newPassword', data.newPassword)
            const result = await updateSystemPasswordAction(null, fd)
            if (result?.success === false) throw result
            return result
        },
        onSuccess: () => {
            toast.success('Senha atualizada com sucesso.')
            setShowChangePassword(false)
            passwordForm.reset()
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return
            if (error?.errorType === 'incorrect-credentials') {
                toast.error('Senha atual incorreta.')
            } else {
                toast.error('Ocorreu um erro. Tente novamente.')
            }
        },
    })

    const cancelSystemLoginMutation = useMutation({
        mutationFn: async () => {
            const result = await cancelSystemLoginAction()
            if (result?.success === false) throw result
            return result
        },
        onSuccess: () => onSuccess(),
        onError: (error: any) => {
            if (isRedirectError(error)) return
            toast.error('Ocorreu um erro. Tente novamente.')
        },
    })

    const verifyingEmail = !isEmailVerified ? email : null

    return (
        <Card>
            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <KeyRound className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-1">
                        Acesso ao Sistema
                    </h2>
                    <p className="text-muted-foreground font-light">
                        Gerencie seu e-mail e senha de login
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {/* E-mail atual + status */}
                <div className="p-4 bg-muted/40 dark:bg-muted/20 rounded-2xl border space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">
                                E-mail de login
                            </p>
                            <p className="font-medium">{email}</p>
                        </div>
                        {isEmailVerified ? (
                            <Badge variant="green" className="gap-2">
                                <CheckCircle2 />
                                Verificado
                            </Badge>
                        ) : (
                            <Badge variant="orange" className="gap-2">
                                <Clock />
                                Aguardando verificação
                            </Badge>
                        )}
                    </div>

                    {emailChangeCode && (
                        <>
                            <div className="border-t" />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">
                                        Novo e-mail
                                    </p>
                                    <p className="font-medium">
                                        {emailChangeCode.newEmail}
                                    </p>
                                </div>
                                <Badge variant="orange" className="gap-2">
                                    <Clock />
                                    Aguardando verificação
                                </Badge>
                            </div>
                            <VerifyEmailChangeForm
                                newEmail={emailChangeCode.newEmail}
                                onSuccess={() => {
                                    toast.success(
                                        'E-mail atualizado com sucesso.',
                                    )
                                    onSuccess()
                                }}
                                onCancel={() => onSuccess()}
                            />
                        </>
                    )}

                    {verifyingEmail && (
                        <VerifyEmailForm
                            email={verifyingEmail}
                            onSuccess={onSuccess}
                            onCancel={() => cancelSystemLoginMutation.mutate()}
                            isLoading={cancelSystemLoginMutation.isPending}
                        />
                    )}
                </div>

                {/* Alterar E-mail */}
                {isEmailVerified && !emailChangeCode && (
                    <div className="border rounded-2xl overflow-hidden">
                        <button
                            type="button"
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors cursor-pointer"
                            onClick={() => setShowChangeEmail(v => !v)}
                            data-testid="change-email-toggle"
                        >
                            <span className="font-medium">Alterar E-mail</span>
                            {showChangeEmail ? (
                                <ChevronUp className="size-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="size-4 text-muted-foreground" />
                            )}
                        </button>

                        {showChangeEmail && (
                            <form
                                onSubmit={emailForm.handleSubmit(data => {
                                    if (email === data.newEmail) {
                                        toast.error(
                                            'Novo e-mail é igual ao atual',
                                        )
                                        return
                                    }
                                    requestEmailChangeMutation.mutate(data)
                                })}
                                className="p-4 space-y-4 border-t"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="new-email">
                                        Novo E-mail
                                    </Label>
                                    <Input
                                        id="new-email"
                                        type="email"
                                        placeholder="nome@email.com"
                                        data-testid="new-email-input"
                                        {...emailForm.register('newEmail')}
                                        aria-invalid={
                                            !!emailForm.formState.errors
                                                .newEmail
                                        }
                                    />
                                    {emailForm.formState.errors.newEmail && (
                                        <span className="text-sm text-destructive">
                                            {
                                                emailForm.formState.errors
                                                    .newEmail.message
                                            }
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() =>
                                            setShowChangeEmail(false)
                                        }
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={
                                            requestEmailChangeMutation.isPending
                                        }
                                        data-testid="save-email-button"
                                    >
                                        {requestEmailChangeMutation.isPending && (
                                            <Loader2 className="animate-spin" />
                                        )}
                                        Salvar
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {/* Alterar Senha */}
                {isEmailVerified && (
                    <div className="border rounded-2xl overflow-hidden">
                        <button
                            type="button"
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors cursor-pointer"
                            onClick={() => setShowChangePassword(v => !v)}
                            data-testid="change-password-toggle"
                        >
                            <span className="font-medium">Alterar Senha</span>
                            {showChangePassword ? (
                                <ChevronUp className="size-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="size-4 text-muted-foreground" />
                            )}
                        </button>

                        {showChangePassword && (
                            <form
                                onSubmit={passwordForm.handleSubmit(data =>
                                    changePasswordMutation.mutate(data),
                                )}
                                className="p-4 space-y-4 border-t"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="current-password">
                                        Senha Atual
                                    </Label>
                                    <Input
                                        id="current-password"
                                        type="password"
                                        placeholder="••••••••"
                                        {...passwordForm.register(
                                            'currentPassword',
                                        )}
                                        aria-invalid={
                                            !!passwordForm.formState.errors
                                                .currentPassword
                                        }
                                    />
                                    {passwordForm.formState.errors
                                        .currentPassword && (
                                        <span className="text-sm text-destructive">
                                            {
                                                passwordForm.formState.errors
                                                    .currentPassword.message
                                            }
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">
                                        Nova Senha
                                    </Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        placeholder="••••••••"
                                        data-testid="new-password-input"
                                        {...passwordForm.register(
                                            'newPassword',
                                        )}
                                        aria-invalid={
                                            !!passwordForm.formState.errors
                                                .newPassword
                                        }
                                    />
                                    {passwordForm.formState.errors
                                        .newPassword && (
                                        <span className="text-sm text-destructive">
                                            {
                                                passwordForm.formState.errors
                                                    .newPassword.message
                                            }
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-new-password">
                                        Confirmar Nova Senha
                                    </Label>
                                    <Input
                                        id="confirm-new-password"
                                        type="password"
                                        placeholder="••••••••"
                                        data-testid="confirm-new-password-input"
                                        {...passwordForm.register(
                                            'confirmNewPassword',
                                        )}
                                        aria-invalid={
                                            !!passwordForm.formState.errors
                                                .confirmNewPassword
                                        }
                                    />
                                    {passwordForm.formState.errors
                                        .confirmNewPassword && (
                                        <span className="text-sm text-destructive">
                                            {
                                                passwordForm.formState.errors
                                                    .confirmNewPassword.message
                                            }
                                        </span>
                                    )}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() =>
                                            setShowChangePassword(false)
                                        }
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={
                                            changePasswordMutation.isPending
                                        }
                                        data-testid="save-password-button"
                                    >
                                        {changePasswordMutation.isPending && (
                                            <Loader2 className="animate-spin" />
                                        )}
                                        Salvar
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </Card>
    )
}
