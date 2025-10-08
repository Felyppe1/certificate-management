import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function Loading() {
    return (
        <Card className="max-w-lg w-full m-auto">
            <CardContent className="flex flex-col items-center text-center gap-6 py-12">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/40 rounded-full blur-3xl animate-pulse" />

                    <Loader2 className="size-20 animate-spin text-primary" />
                </div>

                <h1 className="text-3xl font-bold text-foreground">
                    Carregando
                    <span className="inline-flex ml-1">
                        <span
                            className="animate-bounce ml-1"
                            style={{ animationDelay: '0ms' }}
                        >
                            .
                        </span>
                        <span
                            className="animate-bounce ml-1"
                            style={{ animationDelay: '150ms' }}
                        >
                            .
                        </span>
                        <span
                            className="animate-bounce ml-1"
                            style={{ animationDelay: '300ms' }}
                        >
                            .
                        </span>
                    </span>
                </h1>
            </CardContent>
        </Card>
    )
}
