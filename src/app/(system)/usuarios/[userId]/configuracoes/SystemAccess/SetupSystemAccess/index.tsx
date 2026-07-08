import { setSystemLoginAction } from '@/backend/infrastructure/server-actions/set-system-login-action'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, Loader2 } from 'lucide-react'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import z from 'zod'

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

type SetupData = z.infer<typeof setupSchema>

export function SetupSystemAccess({
    onSuccess,
}: {
    googleEmail: string | null
    onSuccess: () => void
}) {
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
        onSuccess: () => {
            reset()
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
                        serviço externo
                    </p>
                </div>
            </div>

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
        </Card>
    )
}
