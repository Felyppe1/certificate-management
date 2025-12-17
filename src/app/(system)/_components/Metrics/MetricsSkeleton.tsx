import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function MetricsSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-3 md:gap-6 mb-4 sm:mb-6 md:mb-10">
            {[1, 2].map(i => (
                <Card
                    key={i}
                    className="flex flex-col justify-between p-6 h-full gap-0 md:gap-0"
                >
                    <div>
                        {/* Cabeçalho: Título e talvez um subtítulo curto */}
                        <div className="space-y-2 mb-3">
                            <Skeleton className="h-5 w-[60%]" />
                            {i === 2 && (
                                <Skeleton className="h-3 w-[40%]" />
                            )}{' '}
                            {/* Variação sutil para o 2º card */}
                        </div>

                        {/* O Número Grande (Hero) */}
                        <Skeleton className="h-10 w-18 sm:h-12 sm:w-24 rounded-lg mb-5" />

                        {/* Seção de Comparativo (Mês Atual / Anterior) */}
                        <div className="hidden sm:flex items-center gap-8 mb-4">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-16" /> {/* Label */}
                                <Skeleton className="h-6 w-10" /> {/* Valor */}
                            </div>

                            {/* Divisor visual vertical simulado */}
                            <div className="h-8 w-px bg-border/50" />

                            <div className="space-y-2">
                                <Skeleton className="h-4 w-16" /> {/* Label */}
                                <Skeleton className="h-6 w-10" /> {/* Valor */}
                            </div>
                        </div>
                    </div>

                    {/* Rodapé: A porcentagem e texto de comparação */}
                    <div className="flex items-center gap-2 mt-1">
                        <Skeleton className="h-4 w-4 rounded-full" />{' '}
                        {/* Ícone da % */}
                        <Skeleton className="h-4 w-[80%]" />{' '}
                        {/* Texto explicativo */}
                    </div>
                </Card>
            ))}
        </div>
    )
}
