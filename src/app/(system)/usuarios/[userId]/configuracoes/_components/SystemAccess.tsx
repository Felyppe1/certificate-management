'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    KeyRound,
    Loader2,
    CheckCircle2,
    Clock,
    ChevronDown,
    ChevronUp,
} from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { setSystemLoginAction } from '@/backend/infrastructure/server-actions/set-system-login-action'
import { updateSystemEmailAction } from '@/backend/infrastructure/server-actions/update-system-email-action'
import { updateSystemPasswordAction } from '@/backend/infrastructure/server-actions/update-system-password-action'
import { VerifyEmailForm } from '@/components/VerifyEmailForm'
import { useMe } from '@/custom-hooks/use-me'

const setupSchema = z
    .object({
        email: z.string().email('Formato de e-mail inválido'),
        password: z.string().min(6, 'Mínimo de 6 caracteres').max(100),
        confirmPassword: z.string(),
    })
    .refine(d => d.password === d.confirmPassword, {
        message: 'As senhas não coincidem',
        path: ['confirmPassword'],
    })

const changeEmailSchema = z.object({
    newEmail: z.string().email('Formato de e-mail inválido'),
})

const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Campo obrigatório'),
        newPassword: z.string().min(6, 'Mínimo de 6 caracteres').max(100),
        confirmNewPassword: z.string(),
    })
    .refine(d => d.newPassword === d.confirmNewPassword, {
        message: 'As senhas não coincidem',
        path: ['confirmNewPassword'],
    })

type SetupData = z.infer<typeof setupSchema>
type ChangeEmailData = z.infer<typeof changeEmailSchema>
type ChangePasswordData = z.infer<typeof changePasswordSchema>

export function SystemAccess() {
    const router = useRouter()
    const { data } = useMe()
    const { email, isEmailVerified } = data.user

    const googleEmail =
        data.user.externalAccounts.find(acc => acc.provider === 'GOOGLE')
            ?.email ?? null

    if (email === null) {
        return (
            <SetupSystemAccess
                googleEmail={googleEmail}
                onSuccess={() => router.refresh()}
            />
        )
    }

    return (
        <ManageSystemAccess
            email={email}
            isEmailVerified={isEmailVerified}
            googleEmail={googleEmail}
            onSuccess={() => router.refresh()}
        />
    )
}

function SetupSystemAccess({
    googleEmail,
    onSuccess,
}: {
    googleEmail: string | null
    onSuccess: () => void
}) {
    const [pendingEmail, setPendingEmail] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<SetupData>({ resolver: zodResolver(setupSchema) })

    const mutation = useMutation({
        mutationFn: async (data: SetupData) => {
            const fd = new FormData()
            fd.append('email', data.email)
            fd.append('password', data.password)
            const result = await setSystemLoginAction(null, fd)
            if (result?.success === false) throw result
            return result
        },
        onSuccess: (_, variables) => {
            reset()
            if (variables.email === googleEmail) {
                onSuccess()
            } else {
                setPendingEmail(variables.email)
            }
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
                        Configure um e-mail e senha para entrar sem usar o
                        Google
                    </p>
                </div>
            </div>

            {pendingEmail ? (
                <VerifyEmailForm
                    email={pendingEmail}
                    onSuccess={() => {
                        setPendingEmail(null)
                        onSuccess()
                    }}
                />
            ) : (
                <form
                    onSubmit={handleSubmit(data => mutation.mutate(data))}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <Label htmlFor="setup-email">E-mail</Label>
                        <Input
                            id="setup-email"
                            type="email"
                            placeholder="nome@email.com"
                            {...register('email')}
                            aria-invalid={!!errors.email}
                        />
                        {errors.email && (
                            <span className="text-sm text-destructive">
                                {errors.email.message}
                            </span>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="setup-password">Senha</Label>
                        <Input
                            id="setup-password"
                            type="password"
                            placeholder="••••••••"
                            {...register('password')}
                            aria-invalid={!!errors.password}
                        />
                        {errors.password && (
                            <span className="text-sm text-destructive">
                                {errors.password.message}
                            </span>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="setup-confirm-password">
                            Confirmar Senha
                        </Label>
                        <Input
                            id="setup-confirm-password"
                            type="password"
                            placeholder="••••••••"
                            {...register('confirmPassword')}
                            aria-invalid={!!errors.confirmPassword}
                        />
                        {errors.confirmPassword && (
                            <span className="text-sm text-destructive">
                                {errors.confirmPassword.message}
                            </span>
                        )}
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending && (
                                <Loader2 className="animate-spin" />
                            )}
                            Configurar Acesso
                        </Button>
                    </div>
                </form>
            )}
        </Card>
    )
}

function ManageSystemAccess({
    email,
    isEmailVerified,
    googleEmail,
    onSuccess,
}: {
    email: string
    isEmailVerified: boolean
    googleEmail: string | null
    onSuccess: () => void
}) {
    const [showChangeEmail, setShowChangeEmail] = useState(false)
    const [showChangePassword, setShowChangePassword] = useState(false)
    const [pendingNewEmail, setPendingNewEmail] = useState<string | null>(null)

    const emailForm = useForm<ChangeEmailData>({
        resolver: zodResolver(changeEmailSchema),
    })
    const passwordForm = useForm<ChangePasswordData>({
        resolver: zodResolver(changePasswordSchema),
    })

    const changeEmailMutation = useMutation({
        mutationFn: async (data: ChangeEmailData) => {
            const fd = new FormData()
            fd.append('newEmail', data.newEmail)
            const result = await updateSystemEmailAction(null, fd)
            if (result?.success === false) throw result
            return result
        },
        onSuccess: (result, variables) => {
            if (result?.wasLoggedOut) return
            setShowChangeEmail(false)
            emailForm.reset()
            if (variables.newEmail === googleEmail) {
                onSuccess()
            } else {
                setPendingNewEmail(variables.newEmail)
            }
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

    const verifyingEmail = pendingNewEmail ?? (!isEmailVerified ? email : null)

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
                {/* Email atual + status */}
                <div className="p-4 bg-muted/40 dark:bg-muted/20 rounded-2xl border space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">
                                E-mail de login
                            </p>
                            <p className="font-medium">
                                {pendingNewEmail ?? email}
                            </p>
                        </div>
                        {isEmailVerified && !pendingNewEmail ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="size-3" />
                                Verificado
                            </Badge>
                        ) : (
                            <Badge variant="orange">
                                <Clock />
                                Aguardando verificação
                            </Badge>
                        )}
                    </div>

                    {verifyingEmail && (
                        <VerifyEmailForm
                            email={verifyingEmail}
                            onSuccess={() => {
                                setPendingNewEmail(null)
                                onSuccess()
                            }}
                        />
                    )}
                </div>

                {/* Alterar E-mail */}
                <div className="border rounded-2xl overflow-hidden">
                    <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                        onClick={() => setShowChangeEmail(v => !v)}
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
                                    toast.error('Novo e-mail é igual ao atual')
                                    return
                                }

                                changeEmailMutation.mutate(data)
                            })}
                            className="p-4 space-y-4 border-t"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="new-email">Novo E-mail</Label>
                                <Input
                                    id="new-email"
                                    type="email"
                                    placeholder="nome@email.com"
                                    {...emailForm.register('newEmail')}
                                    aria-invalid={
                                        !!emailForm.formState.errors.newEmail
                                    }
                                />
                                {emailForm.formState.errors.newEmail && (
                                    <span className="text-sm text-destructive">
                                        {
                                            emailForm.formState.errors.newEmail
                                                .message
                                        }
                                    </span>
                                )}
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowChangeEmail(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={changeEmailMutation.isPending}
                                >
                                    {changeEmailMutation.isPending && (
                                        <Loader2 className="animate-spin" />
                                    )}
                                    Salvar
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Alterar Senha */}
                <div className="border rounded-2xl overflow-hidden">
                    <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                        onClick={() => setShowChangePassword(v => !v)}
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
                                <Label htmlFor="new-password">Nova Senha</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    placeholder="••••••••"
                                    {...passwordForm.register('newPassword')}
                                    aria-invalid={
                                        !!passwordForm.formState.errors
                                            .newPassword
                                    }
                                />
                                {passwordForm.formState.errors.newPassword && (
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
                                    onClick={() => setShowChangePassword(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={changePasswordMutation.isPending}
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
            </div>
        </Card>
    )
}
