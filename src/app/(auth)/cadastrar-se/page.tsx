import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signUpAction } from '@/backend/infrastructure/server-actions/sign-up-action'

export default function SignUp() {
    return (
        <div>
            <h1>Cadastrar-se</h1>
            <div>
                <form action={signUpAction}>
                    <Input
                        type="text"
                        name="name"
                        placeholder="Nome"
                        required
                    />
                    <Input
                        type="email"
                        name="email"
                        placeholder="Email"
                        required
                    />
                    <Input
                        type="password"
                        name="password"
                        placeholder="Senha"
                        required
                    />
                    <Button type="submit">Cadastrar</Button>
                </form>
            </div>
        </div>
    )
}
