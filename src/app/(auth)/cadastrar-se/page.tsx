import Link from 'next/link'
import { SignUpForm } from './signup-form'
import { GoogleButton } from '@/components/GoogleButton'

export default function SignUp() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Bem-vindo</h1>
                    <p className="text-muted-foreground">
                        Gerencie e gere certificados de forma rápida.
                    </p>
                </div>

                <div className="bg-card border rounded-xl p-8 space-y-6 shadow-lg">
                    <GoogleButton text="Cadastrar com Google" />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-card text-muted-foreground">
                                OU CONTINUE COM
                            </span>
                        </div>
                    </div>

                    <SignUpForm />
                </div>

                <div className="text-center text-sm">
                    <span className="text-muted-foreground">
                        Já tem uma conta?{' '}
                    </span>
                    <Link
                        href="/entrar"
                        className="text-primary font-semibold hover:underline"
                    >
                        Entrar
                    </Link>
                </div>
            </div>
        </div>
    )
}
