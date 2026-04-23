import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { SignUpForm } from './_components/signup-form'
import { GoogleButton } from '@/components/GoogleButton'
import { Metadata } from 'next'
import { RequestAccessModal } from '@/components/RequestAccessModal'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = {
    title: 'Cadastrar-se',
}

export default function SignUp() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center sm:mb-4">
                        <Logo className="w-34 sm:w-40 shrink-0" />
                    </div>
                    <p className="text-muted-foreground">
                        Gerencie e gere certificados de forma rápida.
                    </p>
                </div>

                <Card className="gap-6">
                    <div className="flex flex-col items-center gap-2 sm:gap-3">
                        <GoogleButton size="lg" text="Cadastrar com Google" />
                        <RequestAccessModal />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-card text-muted-foreground">
                                OU
                            </span>
                        </div>
                    </div>

                    <SignUpForm />
                </Card>

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

            <div className="mt-8 text-center text-sm text-muted-foreground">
                Ao cadastrar-se, você concorda com nossos{' '}
                <Link
                    href="/termos-de-servico"
                    className="text-primary hover:underline"
                >
                    Termos de Serviço
                </Link>{' '}
                e{' '}
                <Link
                    href="/politicas-de-privacidade"
                    className="text-primary hover:underline"
                >
                    Política de Privacidade
                </Link>
            </div>
        </div>
    )
}
