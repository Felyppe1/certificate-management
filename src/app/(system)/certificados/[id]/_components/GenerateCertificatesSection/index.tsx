'use client'

import { GENERATION_STATUS } from '@/backend/domain/data-set'
import { generateCertificatesAction } from '@/backend/infrastructure/server-actions/generate-certificates-action'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Download,
    FileCheck,
    Loader2,
    CheckCircle2,
    CircleAlert,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { startTransition, useActionState, useEffect, useRef } from 'react'

interface GenerateCertificatesSectionProps {
    certificateId: string
    allVariablesWereMapped: boolean
    dataSet: {
        id: string
        rows: Record<string, any>[]
        generationStatus: GENERATION_STATUS | null
    } | null
}

export function GenerateCertificatesSection({
    certificateId,
    allVariablesWereMapped,
    dataSet,
}: GenerateCertificatesSectionProps) {
    const [state, action, isGeneratePending] = useActionState(
        generateCertificatesAction,
        null,
    )

    useDataSetPolling(dataSet?.id || null, {
        enabled: dataSet?.generationStatus === GENERATION_STATUS.PENDING,
    })

    const handleGenerate = async () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)

        startTransition(() => {
            action(formData)
        })
    }

    const totalRecords = dataSet?.rows.length || 0
    const certificatesWereGenerated =
        dataSet?.generationStatus === GENERATION_STATUS.COMPLETED
    const canGenerate = allVariablesWereMapped && !certificatesWereGenerated

    const isPending =
        isGeneratePending ||
        dataSet?.generationStatus === GENERATION_STATUS.PENDING

    return (
        <Card>
            <CardHeader>
                <CardTitle>Geração de Certificados</CardTitle>
                <CardDescription>
                    Gere os arquivos do certificado para todos os participantes
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!allVariablesWereMapped && (
                    <div className="bg-muted/50 border rounded-lg p-4">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 text-orange-600 dark:text-orange-400">
                                <CircleAlert className="size-4.5" />
                            </div>
                            <div className="text-sm">
                                <p className="font-medium mb-1">
                                    Mapeamento necessário
                                </p>
                                <p className="text-muted-foreground">
                                    Complete o mapeamento de variáveis para
                                    poder gerar os certificados.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {certificatesWereGenerated && (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="text-sm">
                                <p className="font-medium text-green-900 dark:text-green-100">
                                    Certificados gerados com sucesso
                                </p>
                                <p className="text-green-700 dark:text-green-300">
                                    {totalRecords} certificado
                                    {totalRecords !== 1 ? 's' : ''} gerado
                                    {totalRecords !== 1 ? 's' : ''} e pronto
                                    {totalRecords !== 1 ? 's' : ''} para
                                    download.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-4 items-center justify-between p-6 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                            <FileCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="font-medium text-lg">
                                {totalRecords}{' '}
                                {totalRecords === 1
                                    ? 'certificado'
                                    : 'certificados'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {certificatesWereGenerated
                                    ? totalRecords === 1
                                        ? 'Gerado e disponível'
                                        : 'Gerados e disponíveis'
                                    : totalRecords === 1
                                      ? 'será gerado'
                                      : 'serão gerados'}
                            </p>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        onClick={handleGenerate}
                        disabled={/* !canGenerate || */ isPending}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Gerando...
                            </>
                        ) : certificatesWereGenerated ? (
                            <>
                                <Download className="h-4 w-4 mr-2" />
                                Gerar Novamente
                            </>
                        ) : (
                            <>
                                <FileCheck className="h-4 w-4 mr-2" />
                                Gerar Certificados
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

interface UseDataSetPollingOptions {
    enabled: boolean
    onComplete?: (status: GENERATION_STATUS) => void
}

export function useDataSetPolling(
    dataSetId: string | null,
    options: UseDataSetPollingOptions,
) {
    const router = useRouter()
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const attemptsRef = useRef(0)

    const { enabled, onComplete } = options

    useEffect(() => {
        if (!dataSetId || !enabled) return

        const checkStatus = async (): Promise<boolean> => {
            console.log(`Tentativa ${attemptsRef.current}`)
            try {
                const response = await fetch(`/api/data-sets/${dataSetId}`, {
                    cache: 'no-store',
                })

                if (!response.ok) {
                    throw new Error('Erro ao buscar status')
                }

                const { dataSet } = await response.json()

                const isComplete =
                    dataSet.generationStatus !== GENERATION_STATUS.PENDING

                if (isComplete) {
                    onComplete?.(dataSet.generationStatus)
                    router.refresh()

                    return true
                }

                return false
            } catch (error) {
                console.error('Erro no polling:', error)
                return false
            }
        }

        const scheduleNext = () => {
            timeoutRef.current = setTimeout(async () => {
                attemptsRef.current++
                const shouldStop = await checkStatus()

                if (!shouldStop) {
                    scheduleNext()
                }
            }, 5000)
        }

        scheduleNext()

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [dataSetId, enabled, onComplete, router])
}
