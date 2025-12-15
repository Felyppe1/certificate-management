import Link from 'next/link'
import { GoogleButton } from '@/components/GoogleButton'
import { ShieldCheck, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Toast } from './Toast'

export default async function Entrar({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const error = params.error as string | undefined

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            {error && <Toast error={error} />}

            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold">Bem-vindo</h1>
                    <p className="text-muted-foreground">
                        Gerencie e gere certificados de forma rápida.
                    </p>
                </div>

                <Card className="gap-8">
                    <GoogleButton text="Entrar com Google" />

                    <div className="relative mt-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-card text-muted-foreground">
                                POR QUE GOOGLE?
                            </span>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-medium text-lg mb-1">
                                    Segurança integrada
                                </h3>
                                <p className="text-muted-foreground">
                                    Login seguro com sua conta Google. Sem
                                    necessidade de criar nova senha.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-medium text-lg mb-1">
                                    Ecossistema conectado
                                </h3>
                                <p className="text-muted-foreground">
                                    Aproveite integrações com serviços Google
                                    para maior produtividade.
                                </p>
                            </div>
                        </div>

                        {/* <div className="grid grid-cols-2 gap-3 pt-2">
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                                <div className="p-1.5 rounded bg-blue-500/10">
                                    <Calendar className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium">
                                        Google Calendar
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Sincronize eventos
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                                <div className="p-1.5 rounded bg-blue-500/10">
                                    <Mail className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium">Gmail</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Integre e-mails
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                                <div className="p-1.5 rounded bg-blue-500/10">
                                    <HardDrive className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium">
                                        Google Drive
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Armazene arquivos
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                                <div className="p-1.5 rounded bg-blue-500/10">
                                    <Users className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium">
                                        Google Contacts
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Gerencie contatos
                                    </p>
                                </div>
                            </div>
                        </div> */}
                    </div>
                </Card>
            </div>

            <div className="mt-8 text-center text-sm text-muted-foreground">
                Ao entrar, você concorda com nossos{' '}
                <Link
                    href="/termos-de-uso"
                    className="text-primary hover:underline"
                >
                    Termos de Uso
                </Link>{' '}
                e{' '}
                <Link
                    href="/politica-de-privacidade"
                    className="text-primary hover:underline"
                >
                    Política de Privacidade
                </Link>
            </div>
        </div>
    )
}
