'use client'

import { useCertificateEmissionsMetrics } from '@/custom-hooks/use-certificate-emissions-metrics'
import { Card } from '@/components/ui/card'
import { Clock } from 'lucide-react'
import { MetricsSkeleton } from './MetricsSkeleton'
import { MetricChart, MetricChartDataPoint } from './MetricChart'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

function formatDate(isoDate: string): string {
    const d = new Date(isoDate)
    const day = String(d.getUTCDate()).padStart(2, '0')
    const month = String(d.getUTCMonth() + 1).padStart(2, '0')
    return `${day}/${month}`
}

export function Metrics() {
    const { data, isLoading } = useCertificateEmissionsMetrics()

    if (isLoading) return <MetricsSkeleton />

    const { certificateEmissionsMetrics } = data

    const certificatesChartData: MetricChartDataPoint[] =
        certificateEmissionsMetrics.dailyCertificates.map(
            (d: { date: string; quantity: number }) => ({
                date: formatDate(d.date),
                value: d.quantity,
            }),
        )

    const emailsChartData: MetricChartDataPoint[] =
        certificateEmissionsMetrics.dailyEmails.map(
            (d: { date: string; quantity: number }) => ({
                date: formatDate(d.date),
                value: d.quantity,
            }),
        )

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-3 md:gap-6 mb-4 sm:mb-6 md:mb-10">
            <Card>
                <div>
                    <div className="flex gap-6">
                        <p className="mb-1 text-base sm:text-lg">
                            Total de Certificados Gerados:
                        </p>
                        <h2 className="text-4xl sm:text-5xl font-bold text-foreground">
                            {
                                certificateEmissionsMetrics.totalCertificatesGenerated
                            }
                        </h2>
                    </div>
                    <MetricChart
                        data={certificatesChartData}
                        color="#0073ff"
                        valueLabel="Certificados Gerados"
                    />
                </div>
            </Card>

            <Card>
                <div>
                    <div className="flex gap-6">
                        <div className="flex items-center gap-x-4 gap-y-0 flex-wrap mb-1">
                            <p className="text-base sm:text-lg min-w-fit">
                                Total de E-mails Enviados:
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <h2 className="text-4xl sm:text-5xl font-bold text-foreground">
                                {certificateEmissionsMetrics.totalEmailsSent}
                            </h2>
                            <Popover>
                                <PopoverTrigger className="h-fit cursor-pointer text-muted-foreground p-0.5 mt-2 outline-none rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50">
                                    <Clock className="size-3 sm:size-3.5 hover:text-muted-foreground/85" />
                                </PopoverTrigger>
                                <PopoverContent className="z-52 bg-blue-800 text-zinc-100 border-none w-58 sm:w-58 px-3 py-2 md:px-4 md:py-3 shadow-xl rounded-md">
                                    <p className="text-xs sm:text-sm">
                                        Essa métrica pode ter um delay para
                                        atualizar
                                    </p>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <MetricChart
                        data={emailsChartData}
                        color="#aa50ff"
                        valueLabel="E-mails Enviados"
                    />
                </div>
            </Card>
        </div>
    )
}
