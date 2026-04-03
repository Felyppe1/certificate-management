'use client'

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

export interface MetricChartDataPoint {
    date: string
    value: number
    extraLabel?: string
    extraValue?: number
}

interface MetricChartProps {
    data: MetricChartDataPoint[]
    color: string
    valueLabel: string
}

interface CustomTooltipProps {
    active?: boolean
    payload?: { payload: MetricChartDataPoint }[]
    valueLabel: string
    color: string
}

function CustomTooltip({
    active,
    payload,
    valueLabel,
    color,
}: CustomTooltipProps) {
    if (!active || !payload?.length) return null

    const point = payload[0].payload

    return (
        <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-md text-xs">
            <p className="font-medium text-popover-foreground mb-0.5">
                {point.date}
            </p>
            <p className="text-muted-foreground">
                {valueLabel}:{' '}
                <span className="font-semibold" style={{ color }}>
                    {point.value}
                </span>
            </p>
            {point.extraLabel && point.extraValue !== undefined && (
                <p className="text-muted-foreground">
                    {point.extraLabel}:{' '}
                    <span className="font-semibold" style={{ color }}>
                        {point.extraValue}
                    </span>
                </p>
            )}
        </div>
    )
}

export function MetricChart({ data, color, valueLabel }: MetricChartProps) {
    const uniqueDays = new Set(data.map(d => d.date)).size
    if (uniqueDays < 2) {
        return (
            <div className="w-full mt-3 min-h-[5rem] flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-md bg-muted/20 text-center px-4">
                Não há dados suficientes para exibir o gráfico
            </div>
        )
    }

    const trimmed = data.slice(-30)
    const len = trimmed.length

    // Calcula 5 pontos distribuídos para o eixo X
    const ticks =
        len > 0
            ? ([
                  ...new Set([
                      trimmed[0]?.date,
                      trimmed[Math.floor(len * 0.25)]?.date,
                      trimmed[Math.floor(len * 0.5)]?.date,
                      trimmed[Math.floor(len * 0.75)]?.date,
                      trimmed[len - 1]?.date,
                  ]),
              ].filter(Boolean) as string[])
            : undefined

    const gradientId = `gradient-${color.replace(/[^a-zA-Z0-9]/g, '')}`

    return (
        <div className="w-full mt-3 [&_.recharts-surface]:outline-none [&_.recharts-surface]:rounded-sm [&_.recharts-surface]:focus-visible:ring-[3px] [&_.recharts-surface]:focus-visible:ring-ring/50    [&_.recharts-zIndex-layer\_2000]:outline-none [&_.recharts-zIndex-layer\_100]:outline-none">
            <ResponsiveContainer width="100%" height={120}>
                <AreaChart
                    data={trimmed}
                    margin={{ top: 4, right: 16, left: 16, bottom: 0 }}
                >
                    <defs>
                        <linearGradient
                            id={gradientId}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="5%"
                                style={{ stopColor: color, stopOpacity: 0.8 }}
                            />
                            <stop
                                offset="95%"
                                style={{ stopColor: color, stopOpacity: 0.1 }}
                            />
                        </linearGradient>
                    </defs>
                    <XAxis
                        dataKey="date"
                        ticks={ticks}
                        tick={{
                            fontSize: 12,
                            fill: 'var(--muted-foreground)',
                        }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        tickMargin={8}
                    />
                    <Tooltip
                        content={
                            <CustomTooltip
                                valueLabel={valueLabel}
                                color={color}
                            />
                        }
                        cursor={{
                            stroke: color,
                            strokeWidth: 1,
                            strokeDasharray: '3 3',
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        fill={`url(#${gradientId})`}
                        dot={false}
                        activeDot={{
                            r: 4,
                            fill: color,
                            stroke: 'hsl(var(--background))',
                            strokeWidth: 2,
                        }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
