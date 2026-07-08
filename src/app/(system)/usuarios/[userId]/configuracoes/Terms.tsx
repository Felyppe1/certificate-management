import { Card } from '@/components/ui/card'
import { ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'

export function Terms() {
    return (
        <Card>
            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-1">
                        Documentos Legais
                    </h2>
                    <p className="text-muted-foreground font-light">
                        Conheça nossos termos e políticas
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <Link
                    href="/termos-de-servico"
                    target="_blank"
                    className="flex items-center justify-between p-4 bg-muted/40 dark:bg-muted/20 rounded-2xl border hover:bg-muted/60 dark:hover:bg-muted/30 transition-colors"
                >
                    <div>
                        <p className="font-medium">Termos de Serviço</p>
                        <p className="text-sm text-muted-foreground">
                            Condições de uso da plataforma
                        </p>
                    </div>
                    <ArrowLeft className="w-5 h-5 rotate-180 text-muted-foreground" />
                </Link>

                <Link
                    href="/politicas-de-privacidade"
                    target="_blank"
                    className="flex items-center justify-between p-4 bg-muted/40 dark:bg-muted/20 rounded-2xl border hover:bg-muted/60 dark:hover:bg-muted/30 transition-colors"
                >
                    <div>
                        <p className="font-medium">Políticas de Privacidade</p>
                        <p className="text-sm text-muted-foreground">
                            Como protegemos seus dados
                        </p>
                    </div>
                    <ArrowLeft className="w-5 h-5 rotate-180 text-muted-foreground" />
                </Link>
            </div>
        </Card>
    )
}
