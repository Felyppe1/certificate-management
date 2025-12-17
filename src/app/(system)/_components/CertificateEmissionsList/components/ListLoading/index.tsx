import { Skeleton } from '@/components/ui/skeleton'

export function ListLoading() {
    return (
        <div className="divide-y">
            {Array.from({ length: 3 }).map((_, index) => (
                <div
                    key={index}
                    // Adicionei gap-4 para garantir espaço entre texto e botões no mobile
                    className="flex items-center justify-between py-6 px-2 gap-4"
                >
                    {/* min-w-0: Permite que este container encolha se faltar espaço 
                        (sem isso, o flex item tenta forçar sua largura total e estoura a tela)
                    */}
                    <div className="flex-1 space-y-2 min-w-0">
                        {/* w-[X%]: Garante fluidez. 
                            max-w-[Ypx]: Impede que fique gigante em telas grandes.
                        */}
                        <Skeleton className="h-5 sm:h-6 w-[70%] max-w-[200px]" />
                        <Skeleton className="h-3 sm:h-4 w-[90%] max-w-[280px]" />
                    </div>

                    {/* shrink-0: Impede que os botões sejam esmagados */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Ocultamos o botão maior em mobile muito pequeno se necessário, ou ajustamos a largura */}
                        <Skeleton className="h-7 sm:h-9 w-16 sm:w-20 sm:w-28 rounded-full" />
                        <Skeleton className="h-5 sm:h-7 w-5 sm:w-7 rounded-sm sm:rounded-md" />
                    </div>
                </div>
            ))}
        </div>
    )
}
