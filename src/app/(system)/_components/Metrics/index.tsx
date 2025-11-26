import { fetchCertificateEmissionsMetricsByUser } from '@/api-calls/fetch-certificate-emissions-metrics-by-user'
import { Card } from '@/components/ui/card'
import { Clock, Minus, TrendingDown, TrendingUp } from 'lucide-react'

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <Card className="">
                <div className="relative">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <p className="mb-2 text-lg">
                                Total de Certificados Gerados
                            </p>
                            <h2 className="text-5xl font-bold text-foreground">
                                {
                                    certificateEmissionsMetrics.totalCertificatesGenerated
                                }
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-1">
                        {getVariationIcon(certificatesVariation)}
                        <span
                            className={`${getVariationColor(certificatesVariation)} font-medium ml-1`}
                        >
                            {certificatesVariation > 0 ? '+' : ''}
                            {certificatesVariation.toFixed(1)}%
                        </span>
                        <span className="ml-2 font-light">
                            em relação ao mês anterior
                        </span>
                    </div>
                </div>
            </Card>

            {/* Card 2 - E-mails Enviados */}
            <Card className="">
                <div className="">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                                <p className="text-lg">
                                    Total de E-mails Enviados
                                </p>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>
                                        Esta métrica pode ter um delay para
                                        atualizar
                                    </span>
                                </div>
                            </div>
                            <h2 className="text-5xl font-bold text-foreground">
                                {certificateEmissionsMetrics.totalEmailsSent}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-1 mb-3">
                        {getVariationIcon(emailsVariation)}
                        <span
                            className={`${getVariationColor(emailsVariation)} font-medium ml-1`}
                        >
                            {emailsVariation > 0 ? '+' : ''}
                            {emailsVariation.toFixed(1)}%
                        </span>
                        <span className="ml-2 font-light">
                            em relação ao mês anterior
                        </span>
                    </div>
                </div>
            </Card>
        </div>
    )
}
