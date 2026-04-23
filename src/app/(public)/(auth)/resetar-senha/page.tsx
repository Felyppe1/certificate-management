import { Logo } from '@/components/Logo'
import { Card } from '@/components/ui/card'
import { Metadata } from 'next'
import { ResetPasswordForm } from './_components/ResetPasswordForm'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Redefinição de senha',
}

export default async function ResetarSenha({
    searchParams,
}: {
    searchParams: Promise<{ email?: string }>
}) {
    const { email } = await searchParams

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center sm:mb-4">
                        <Logo className="w-34 sm:w-40 shrink-0" />
                    </div>
                    <h1 className="text-2xl font-semibold">
                        Redefinição de senha
                    </h1>
                </div>

                <Card className="gap-6">
                    <ResetPasswordForm email={email ?? ''} />
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
                Ao acessar o sistema, você concorda com nossos{' '}
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
