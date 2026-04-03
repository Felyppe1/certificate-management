'use client'

import { useCertificateEmissionsMetrics } from '@/custom-hooks/use-certificate-emissions-metrics'
import { Card } from '@/components/ui/card'
import { Clock, Info } from 'lucide-react'
import { MetricsSkeleton } from './MetricsSkeleton'
import { MetricChart, MetricChartDataPoint } from './MetricChart'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

const mockCertificatesData: (MetricChartDataPoint & { emissoes: number })[] = [
    { date: '04/03', value: 12, emissoes: 2 },
    { date: '06/03', value: 45, emissoes: 3 },
    { date: '09/03', value: 8, emissoes: 1 },
    { date: '11/03', value: 60, emissoes: 4 },
    { date: '13/03', value: 30, emissoes: 2 },
    { date: '16/03', value: 22, emissoes: 2 },
    { date: '18/03', value: 75, emissoes: 5 },
    { date: '20/03', value: 15, emissoes: 1 },
    { date: '23/03', value: 50, emissoes: 3 },
    { date: '25/03', value: 18, emissoes: 2 },
    { date: '28/03', value: 90, emissoes: 6 },
    { date: '01/04', value: 33, emissoes: 3 },
    { date: '02/04', value: 47, emissoes: 4 },
]

const mockEmailsData: MetricChartDataPoint[] = [
    // { date: '04/03', value: 11 },
    // { date: '06/03', value: 43 },
    // { date: '09/03', value: 7  },
    // { date: '11/03', value: 58 },
    // { date: '13/03', value: 29 },
    // { date: '16/03', value: 21 },
    // { date: '18/03', value: 72 },
    // { date: '20/03', value: 14 },
    // { date: '23/03', value: 49 },
    // { date: '25/03', value: 17 },
    // { date: '28/03', value: 88 },
    // { date: '01/04', value: 30 },
    // { date: '02/04', value: 45 },
]

const certificatesChartData: MetricChartDataPoint[] = mockCertificatesData.map(
    d => ({
        date: d.date,
        value: d.value,
        extraLabel: 'Certificados',
        extraValue: d.emissoes,
    }),
)

const emailsChartData: MetricChartDataPoint[] = mockEmailsData.map((d, i) => ({
    date: d.date,
    value: d.value,
    extraLabel: 'Certificados',
    extraValue: mockCertificatesData[i]?.emissoes,
}))

export function Metrics() {
    const { data, isLoading } = useCertificateEmissionsMetrics()

    if (isLoading) return <MetricsSkeleton />

    const { certificateEmissionsMetrics } = data

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
                        valueLabel="Arquivos"
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
                        valueLabel="E-mails"
                    />
                </div>
            </Card>
        </div>
    )
}
