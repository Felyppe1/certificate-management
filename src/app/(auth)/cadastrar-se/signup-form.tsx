'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActionState, useState } from 'react'
import { signUpAction } from '@/backend/infrastructure/server-actions/sign-up-action'
import { ArrowRight } from 'lucide-react'

export function SignUpForm() {
    const [state, action, isPending] = useActionState(signUpAction, null)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordError, setPasswordError] = useState('')

    const validatePasswords = () => {
        if (password && confirmPassword && password !== confirmPassword) {
            setPasswordError('As senhas não coincidem')
            return false
        }
        setPasswordError('')
        return true
    }

    return (
        <form action={action} className="space-y-4">
            {state?.success === false && state?.message && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive rounded-md">
                    {state.message}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                    Nome completo
                </Label>
                <Input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="João Silva"
                    defaultValue={state?.inputs?.name}
                    required
                    className={`${state?.errors?.name ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {state?.errors?.name && (
                    <span className="text-sm text-destructive">
                        {state?.errors.name}
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
                <Label htmlFor="password" className="text-sm font-medium">
                    Senha
                </Label>
                <Input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => {
                        setPassword(e.target.value)
                        setPasswordError('')
                    }}
                    onBlur={validatePasswords}
                    required
                    className={`${state?.errors?.password || passwordError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {state?.errors?.password && (
                    <span className="text-sm text-destructive">
                        {state?.errors.password}
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
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => {
                        setConfirmPassword(e.target.value)
                        setPasswordError('')
                    }}
                    onBlur={validatePasswords}
                    required
                    className={`${passwordError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {passwordError && (
                    <span className="text-sm text-destructive">
                        {passwordError}
                    </span>
                )}
            </div>

            <Button
                type="submit"
                disabled={
                    isPending ||
                    (password !== confirmPassword && confirmPassword !== '')
                }
                className="w-full"
                size="lg"
            >
                Cadastrar
                <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </form>
    )
}
