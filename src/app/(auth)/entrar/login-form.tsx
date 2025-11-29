'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useActionState } from 'react'
import { loginAction } from '../../../backend/infrastructure/server-actions/login-action'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { AlertMessage } from '@/components/ui/alert-message'

export function LoginForm() {
    const [state, action, isPending] = useActionState(loginAction, null)

    return (
        <form action={action} className="space-y-4">
            {state?.success === false && state?.message && !state?.errors && (
                <AlertMessage
                    variant={'error'}
                    text={state.message}
                    icon={<AlertCircle className="size-5" />}
                />
            )}

            <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                    E-mail
                </Label>
                <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="nome@email.com"
                    defaultValue={state?.inputs?.email}
                    required
                    className={`${state?.errors?.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {state?.errors?.email && (
                    <span className="text-sm text-destructive">
                        {state?.errors.email}
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
                    name="password"
                    placeholder="••••••••"
                    defaultValue={state?.inputs?.password}
                    required
                    className={`${state?.errors?.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {state?.errors?.password && (
                    <span className="text-sm text-destructive">
                        {state?.errors.password}
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
