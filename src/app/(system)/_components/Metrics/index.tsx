'use client'

import { Card } from '@/components/ui/card'
import { Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'

const monthlyMetricsMock = [
    { month: 'Jan', certificates: 120, emails: 110 },
    { month: 'Fev', certificates: 150, emails: 140 },
    { month: 'Mar', certificates: 180, emails: 175 },
    { month: 'Abr', certificates: 220, emails: 210 },
    { month: 'Mai', certificates: 280, emails: 260 },
    { month: 'Jun', certificates: 350, emails: 340 },
    { month: 'Jul', certificates: 390, emails: 400 },
]

const formatInteger = new Intl.NumberFormat('pt-BR')
const chartTickColor = 'var(--muted-foreground)'
const chartGridColor = 'var(--border)'
const chartTooltipBg = 'var(--popover)'
const chartTooltipBorder = 'var(--border)'
const chartTooltipText = 'var(--popover-foreground)'
const chartLinePrimary = 'var(--chart-1)'
const chartLineSecondary = 'var(--chart-4)'

export function Metrics() {
    const [isCompactChart, setIsCompactChart] = useState(false)

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 640px)')

        const updateIsCompactChart = (event: MediaQueryListEvent) => {
            setIsCompactChart(event.matches)
        }

        setIsCompactChart(mediaQuery.matches)
        mediaQuery.addEventListener('change', updateIsCompactChart)

        return () => {
            mediaQuery.removeEventListener('change', updateIsCompactChart)
        }
    }, [])

    const totalCertificatesGenerated = monthlyMetricsMock.reduce(
        (sum, metric) => sum + metric.certificates,
        0,
    )

    const totalEmailsSent = monthlyMetricsMock.reduce(
        (sum, metric) => sum + metric.emails,
        0,
    )

    const chartHeightClass = isCompactChart ? 'h-36' : 'h-40 sm:h-48'
    const chartMargin = isCompactChart
        ? { top: 4, right: 4, left: -18, bottom: 0 }
        : { top: 8, right: 8, left: -12, bottom: 4 }
    const chartTickSize = isCompactChart ? 11 : 13
    const chartTickMargin = isCompactChart ? 6 : 10
    const chartLineWidth = isCompactChart ? 2 : 3
    const chartDotRadius = isCompactChart ? 3 : 4
    const chartActiveDotRadius = isCompactChart ? 5 : 6
    const tooltipLabelSize = isCompactChart ? 13 : 16
    const tooltipItemSize = isCompactChart ? 12 : 14
    const tooltipRadius = isCompactChart ? '0.375rem' : '0.5rem'

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-3 md:gap-6 mb-4 sm:mb-6 md:mb-10">
            <Card className="p-4 sm:p-6">
                <div>
                    <div className="flex items-start justify-between sm:mb-4">
                        <div className="w-full">
                            <p className=" mr-14 text-base sm:text-lg font-semibold">
                                Total de Certificados Gerados
                            </p>

                            <div className="flex justify-between items-center">
                                <h2 className="mt-1 text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
                                    {formatInteger.format(
                                        totalCertificatesGenerated,
                                    )}
                                </h2>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`${chartHeightClass} mt-4 rounded-md focus-within:ring-2 focus-within:ring-ring/50 focus-within:ring-offset-0 [&_.recharts-wrapper:focus]:outline-none [&_.recharts-wrapper:focus-visible]:outline-none [&_.recharts-surface:focus]:outline-none [&_.recharts-surface:focus-visible]:outline-none`}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={monthlyMetricsMock}
                                margin={chartMargin}
                            >
                                <CartesianGrid
                                    stroke={chartGridColor}
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={chartTickMargin}
                                    tick={{
                                        fill: chartTickColor,
                                        fontSize: chartTickSize,
                                    }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={chartTickMargin}
                                    tick={{
                                        fill: chartTickColor,
                                        fontSize: chartTickSize,
                                    }}
                                />
                                <Tooltip
                                    cursor={{
                                        stroke: 'var(--primary)',
                                        strokeWidth: 1,
                                    }}
                                    wrapperStyle={{ outline: 'none' }}
                                    contentStyle={{
                                        backgroundColor: chartTooltipBg,
                                        border: `1px solid ${chartTooltipBorder}`,
                                        borderRadius: tooltipRadius,
                                        boxShadow:
                                            '0 10px 30px rgba(0, 0, 0, 0.35)',
                                    }}
                                    labelStyle={{
                                        color: chartTooltipText,
                                        fontWeight: 700,
                                        fontSize: tooltipLabelSize,
                                    }}
                                    itemStyle={{
                                        color: chartTooltipText,
                                        fontSize: tooltipItemSize,
                                    }}
                                    formatter={value => [
                                        formatInteger.format(
                                            Number(value ?? 0),
                                        ),
                                        'Certificados',
                                    ]}
                                    labelFormatter={label => `Mês: ${label}`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="certificates"
                                    stroke={chartLinePrimary}
                                    strokeWidth={chartLineWidth}
                                    dot={{
                                        r: chartDotRadius,
                                        fill: chartLinePrimary,
                                    }}
                                    activeDot={{ r: chartActiveDotRadius }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </Card>

            {/* Card 2 - E-mails Enviados */}
            <Card className="p-4 sm:p-6">
                <div>
                    <div className="flex items-start justify-between sm:mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-x-4 gap-y-0 flex-wrap">
                                <p className="text-lg min-w-fit font-semibold">
                                    Total de E-mails Enviados
                                </p>
                                <div className="flex items-center gap-1.5 text-[.625rem] sm:text-xs text-muted-foreground/70 mb-1 sm:mb-0">
                                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 min-w-fit" />
                                    <span className="min-w-[9rem]">
                                        Esta métrica pode ter um delay para
                                        atualizar
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <h2 className="mt-1 text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
                                    {formatInteger.format(totalEmailsSent)}
                                </h2>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`${chartHeightClass} mt-4 rounded-md focus-within:ring-2 focus-within:ring-ring/50 focus-within:ring-offset-0 [&_.recharts-wrapper:focus]:outline-none [&_.recharts-wrapper:focus-visible]:outline-none [&_.recharts-surface:focus]:outline-none [&_.recharts-surface:focus-visible]:outline-none`}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={monthlyMetricsMock}
                                margin={chartMargin}
                            >
                                <CartesianGrid
                                    stroke={chartGridColor}
                                    strokeDasharray="3 3"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={chartTickMargin}
                                    tick={{
                                        fill: chartTickColor,
                                        fontSize: chartTickSize,
                                    }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={chartTickMargin}
                                    tick={{
                                        fill: chartTickColor,
                                        fontSize: chartTickSize,
                                    }}
                                />
                                <Tooltip
                                    cursor={{
                                        stroke: 'var(--primary)',
                                        strokeWidth: 1,
                                    }}
                                    wrapperStyle={{ outline: 'none' }}
                                    contentStyle={{
                                        backgroundColor: chartTooltipBg,
                                        border: `1px solid ${chartTooltipBorder}`,
                                        borderRadius: tooltipRadius,
                                        boxShadow:
                                            '0 10px 30px rgba(0, 0, 0, 0.35)',
                                    }}
                                    labelStyle={{
                                        color: chartTooltipText,
                                        fontWeight: 700,
                                        fontSize: tooltipLabelSize,
                                    }}
                                    itemStyle={{
                                        color: chartTooltipText,
                                        fontSize: tooltipItemSize,
                                    }}
                                    formatter={value => [
                                        formatInteger.format(
                                            Number(value ?? 0),
                                        ),
                                        'E-mails',
                                    ]}
                                    labelFormatter={label => `Mês: ${label}`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="emails"
                                    stroke={chartLineSecondary}
                                    strokeWidth={chartLineWidth}
                                    dot={{
                                        r: chartDotRadius,
                                        fill: chartLineSecondary,
                                    }}
                                    activeDot={{ r: chartActiveDotRadius }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </Card>
        </div>
    )
}
