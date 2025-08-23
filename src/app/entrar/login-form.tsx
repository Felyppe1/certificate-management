'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useActionState } from "react"
import { loginAction } from "../../server-actions/login-action"

export function LoginForm() {
    const [state, action, isPending] = useActionState(loginAction, null)
    
    return (
        <form action={action}>
            {state?.success === false && state?.message && <span>{state.message}</span>}

            <div className='flex flex-col gap-2'>
                <label htmlFor="email">Email</label>
                <Input
                    type="email"
                    id="email"
                    name="email"
                    defaultValue={state?.inputs?.email}
                    required
                    className={`${state?.errors?.email ? 'border-destructive' : ''}`}
                />
                {state?.errors?.email && <span className="text-destructive">{state?.errors.email}</span>}

                <label htmlFor="password">Senha</label>
                <Input
                    type="password"
                    id="password"
                    name="password"
                    defaultValue={state?.inputs?.password}
                    required
                    className={`${state?.errors?.password ? 'border-destructive' : ''}`}
                />
                {state?.errors?.password && <span className="text-destructive">{state?.errors.password}</span>}
            </div>

            <Button type="submit" disabled={isPending}>Entrar</Button>
        </form>
    )
}