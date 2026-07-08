'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useTransition } from 'react'
import { signUpAction } from '@/backend/infrastructure/server-actions/sign-up-action'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { AlertMessage } from '@/components/ui/alert-message'

const signUpSchema = z
    .object({
        name: z
            .string()
            .min(3, 'Nome deve ter pelo menos 3 caracteres')
            .max(100, 'Nome deve ter no máximo 100 caracteres'),
        email: z.string().email('Formato de email inválido'),
        password: z
            .string()
            .min(6, 'Senha deve ter pelo menos 6 caracteres')
            .max(100, 'Senha deve ter no máximo 100 caracteres'),
        confirmPassword: z
            .string()
            .min(1, 'A confirmação de senha é obrigatória'),
    })
    .refine(data => data.password === data.confirmPassword, {
        message: 'As senhas não coincidem',
        path: ['confirmPassword'],
    })

type SignUpFormData = z.infer<typeof signUpSchema>

export function SignUpForm() {
    const router = useRouter()
    const [isNavigating, startTransition] = useTransition()
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        getValues,
        formState: { errors },
    } = useForm<SignUpFormData>({
        resolver: zodResolver(signUpSchema),
    })

    const mutation = useMutation({
        mutationFn: async (data: SignUpFormData) => {
            const formData = new FormData()
            formData.append('name', data.name)
            formData.append('email', data.email)
            formData.append('password', data.password)
            return signUpAction(null, formData)
        },
        onSuccess: result => {
            if (result?.success === false) {
                setErrorMessage(
                    result.errorType === 'user-already-exists'
                        ? 'Este e-mail já está em uso.'
                        : 'Ocorreu um erro ao realizar o cadastro. Tente novamente.',
                )
            } else {
                const email = getValues('email')
                const linking = result.googleLinkingSuggestion
                startTransition(() => {
                    router.push(
                        `/verificar-email?email=${encodeURIComponent(email)}${linking ? '&linking=true' : ''}`,
                    )
                })
            }
        },
    })

    return (
        <form
            onSubmit={handleSubmit(data => {
                setErrorMessage(null)
                mutation.mutate(data)
            })}
            className="space-y-4"
        >
            {errorMessage && (
                <AlertMessage
                    variant={'error'}
                    text={errorMessage}
                    icon={<AlertCircle />}
                />
            )}

            <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                    Nome
                </Label>
                <Input
                    type="text"
                    id="name"
                    placeholder="João Silva"
                    {...register('name')}
                    className={`${errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {errors.name && (
                    <span className="text-sm text-destructive">
                        {errors.name.message}
                    </span>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                    E-mail
                </Label>
                <Input
                    type="email"
                    id="email"
                    placeholder="nome@email.com"
                    {...register('email')}
                    className={`${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {errors.email && (
                    <span className="text-sm text-destructive">
                        {errors.email.message}
                    </span>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                    Senha
                </Label>
                <Input
                    type="password"
                    id="password"
                    placeholder="••••••••"
                    {...register('password')}
                    className={`${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {errors.password && (
                    <span className="text-sm text-destructive">
                        {errors.password.message}
                    </span>
                )}
            </div>

            <div className="space-y-2">
                <Label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium"
                >
                    Confirmar senha
                </Label>
                <Input
                    type="password"
                    id="confirmPassword"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    className={`${errors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {errors.confirmPassword && (
                    <span className="text-sm text-destructive">
                        {errors.confirmPassword.message}
                    </span>
                )}
            </div>

            <Button
                type="submit"
                disabled={mutation.isPending || isNavigating}
                className="w-full"
                size="lg"
                data-testid="signup-submit-button"
            >
                {mutation.isPending || isNavigating
                    ? 'Cadastrando...'
                    : 'Cadastrar'}
                <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </form>
    )
}
