interface MonthMetricProps {
    thisMonth: number
    lastMonth: number
}

export function MonthMetric({ thisMonth, lastMonth }: MonthMetricProps) {
    return (
        <div className="flex flex-wrap divide-x divide-muted-foreground/25 gap-6 md:gap-12 mb-3 mt-2 sm:m-0">
            <div className="flex flex-col shrink-0 pr-6 md:pr-12">
                <p className="text-muted-foreground text-sm sm:text-base">
                    Mês Atual
                </p>
                <p className="text-2xl sm:text-3xl font-bold">{thisMonth}</p>
            </div>

            <div className="flex flex-col shrink-0">
                <p className="text-muted-foreground text-sm sm:text-base">
                    Mês Anterior
                </p>
                <p className="text-2xl sm:text-3xl font-bold">{lastMonth}</p>
            </div>
        </div>
    )
}
