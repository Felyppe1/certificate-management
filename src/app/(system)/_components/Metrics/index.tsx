import { fetchCertificateEmissionsMetricsByUser } from '@/api-calls/fetch-certificate-emissions-metrics-by-user'
import { Card } from '@/components/ui/card'
import { Clock, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { MonthMetric } from './MonthMetric'

function calcularVariacaoPercentual(
    mesAtual: number,
    mesAnterior: number,
): number {
    if (mesAnterior === 0) {
        return mesAtual === 0 ? 0 : 100
    }

    return ((mesAtual - mesAnterior) / mesAnterior) * 100
}

function getVariationIcon(variation: number) {
    if (variation > 0) {
        return <TrendingUp className="w-5 h-5 text-emerald-500" />
    } else if (variation < 0) {
        return <TrendingDown className="w-5 h-5 text-red-500" />
    }
    return <Minus className="w-5 h-5 text-muted-foreground" />
}

function getVariationColor(variation: number) {
    if (variation > 0) return 'text-emerald-500'
    if (variation < 0) return 'text-red-500'
    return 'text-muted-foreground'
}

export async function Metrics() {
    const { certificateEmissionsMetrics } =
        await fetchCertificateEmissionsMetricsByUser()

    const certificatesVariation = calcularVariacaoPercentual(
        certificateEmissionsMetrics.totalCertificatesGeneratedThisMonth,
        certificateEmissionsMetrics.totalCertificatesGeneratedLastMonth,
    )

    const emailsVariation = calcularVariacaoPercentual(
        certificateEmissionsMetrics.totalEmailsSentThisMonth,
        certificateEmissionsMetrics.totalEmailsSentLastMonth,
    )

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-6 mb-3 sm:mb-6 md:mb-10">
            <Card>
                <div>
                    <div className="flex items-start justify-between sm:mb-4">
                        <div className="w-full">
                            <p className="mb-1 mr-14 text-base sm:text-lg">
                                Total de Certificados Gerados
                            </p>

                            <div className="flex justify-between">
                                <h2 className="text-4xl sm:text-5xl font-bold text-foreground">
                                    {
                                        certificateEmissionsMetrics.totalCertificatesGenerated
                                    }
                                </h2>
                                <div className="block sm:hidden">
                                    <MonthMetric
                                        thisMonth={
                                            certificateEmissionsMetrics.totalCertificatesGeneratedThisMonth
                                        }
                                        lastMonth={
                                            certificateEmissionsMetrics.totalCertificatesGeneratedLastMonth
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="hidden sm:block">
                        <MonthMetric
                            thisMonth={
                                certificateEmissionsMetrics.totalCertificatesGeneratedThisMonth
                            }
                            lastMonth={
                                certificateEmissionsMetrics.totalCertificatesGeneratedLastMonth
                            }
                        />
                    </div>

                    <div className="flex items-center flex-wrap gap-x-1">
                        {getVariationIcon(certificatesVariation)}
                        <span
                            className={`${getVariationColor(certificatesVariation)} font-medium ml-1 text-sm sm:text-base`}
                        >
                            {certificatesVariation > 0 ? '+' : ''}
                            {certificatesVariation.toFixed(1)}%
                        </span>
                        <span className="ml-2 font-light text-sm sm:text-base">
                            em relação ao mês anterior
                        </span>
                    </div>
                </div>
            </Card>

            {/* Card 2 - E-mails Enviados */}
            <Card>
                <div>
                    <div className="flex items-start justify-between sm:mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-x-4 gap-y-0 flex-wrap">
                                <p className="mb-1 text-lg min-w-fit">
                                    Total de E-mails Enviados
                                </p>
                                <div className="flex items-center gap-1.5 text-[.625rem] sm:text-xs text-muted-foreground/70">
                                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 min-w-fit" />
                                    <span className="min-w-[9rem]">
                                        Esta métrica pode ter um delay para
                                        atualizar
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <h2 className="text-4xl sm:text-5xl font-bold text-foreground">
                                    {
                                        certificateEmissionsMetrics.totalEmailsSent
                                    }
                                </h2>
                                <div className="block sm:hidden">
                                    <MonthMetric
                                        thisMonth={
                                            certificateEmissionsMetrics.totalEmailsSentThisMonth
                                        }
                                        lastMonth={
                                            certificateEmissionsMetrics.totalEmailsSentLastMonth
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="hidden sm:block">
                        <MonthMetric
                            thisMonth={
                                certificateEmissionsMetrics.totalEmailsSentThisMonth
                            }
                            lastMonth={
                                certificateEmissionsMetrics.totalEmailsSentLastMonth
                            }
                        />
                    </div>
                    {/* <div className="flex flex-wrap divide-x divide-muted-foreground/25 gap-6 md:gap-12 mb-3">
                        <div className="flex flex-col shrink-0 pr-6 md:pr-12">
                            <p className="text-muted-foreground text-sm sm:text-base">
                                Mês Atual
                            </p>
                            <p className="text-2xl sm:text-3xl font-bold">
                                {
                                    certificateEmissionsMetrics.totalEmailsSentThisMonth
                                }
                            </p>
                        </div>

                        <div className="flex flex-col shrink-0">
                            <p className="text-muted-foreground text-sm sm:text-base">
                                Mês Anterior
                            </p>
                            <p className="text-2xl sm:text-3xl font-bold">
                                {
                                    certificateEmissionsMetrics.totalEmailsSentLastMonth
                                }
                            </p>
                        </div>
                    </div> */}

                    <div className="flex items-center flex-wrap gap-x-1">
                        {getVariationIcon(emailsVariation)}
                        <span
                            className={`${getVariationColor(emailsVariation)} font-medium ml-1 text-sm sm:text-base`}
                        >
                            {emailsVariation > 0 ? '+' : ''}
                            {emailsVariation.toFixed(1)}%
                        </span>
                        <span className="ml-2 font-light text-sm sm:text-base">
                            em relação ao mês anterior
                        </span>
                    </div>
                </div>
            </Card>
        </div>
    )
}
