'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { AlertMessage } from '@/components/ui/alert-message'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { loginAction } from '../../../backend/infrastructure/server-actions/login-action'
import { useState, useTransition } from 'react'

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
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    })

    const onSubmit = async (data: LoginFormData) => {
        setErrorMessage(null)

        startTransition(async () => {
            const formData = new FormData()
            formData.append('email', data.email)
            formData.append('password', data.password)

            const result = await loginAction(null, formData)

            if (result?.success === false) {
                if (result.errorType === 'invalid-credentials') {
                    setErrorMessage('Email ou senha incorretos.')
                } else {
                    setErrorMessage(
                        'Ocorreu um erro inesperado. Tente novamente.',
                    )
                }
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
