import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { GoogleButton } from '@/components/GoogleButton'
import { Card } from '@/components/ui/card'
import { RequestAccessModal } from '@/components/RequestAccessModal'
import { LoginForm } from './_components/login-form'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Entrar',
}

export default function Entrar() {
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
                        <GoogleButton
                            size="lg"
                            text="Entrar com Google"
                            href="/api/auth/google"
                        />
                        <RequestAccessModal />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-card text-muted-foreground">
                                OU
                            </span>
                        </div>
                    </div>

                    <LoginForm />
                </Card>

                <div className="text-center text-sm">
                    <span className="text-muted-foreground">
                        Ainda não tem uma conta?{' '}
                    </span>
                    <Link
                        href="/cadastrar-se"
                        className="text-primary font-semibold hover:underline"
                    >
                        Cadastrar-se
                    </Link>
                </div>
            </div>

            <div className="mt-8 text-center text-sm text-muted-foreground">
                Ao entrar, você concorda com nossos{' '}
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
