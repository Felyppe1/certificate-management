'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home, OctagonX, RefreshCcw } from 'lucide-react'
import Link from 'next/link'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <Card className="max-w-[20rem] md:max-w-lg w-full m-auto">
            <CardContent className="flex flex-col items-center text-center gap-4 md:gap-6 py-4 md:py-8">
                <div className="relative">
                    <div className="absolute inset-0 bg-destructive/70 rounded-full blur-3xl animate-pulse" />

                    <OctagonX className="size-14 md:size-18 text-destructive" />
                </div>

                <div className="space-y-3">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                        Algo deu errado!
                    </h1>
                    <p className="text-muted-foreground">
                        Ocorreu um erro inesperado ao processar sua solicitação.
                    </p>
                </div>

                <Button
                    onClick={() => reset()}
                    variant="outline"
                    className="gap-2"
                >
                    <RefreshCcw className="size-4" />
                    Tentar novamente
                </Button>

                <Button asChild size="lg">
                    <Link href="/">
                        <Home className="size-5" />
                        Voltar ao início
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
}
