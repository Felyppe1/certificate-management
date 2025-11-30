'use client'

import { GENERATION_STATUS } from '@/backend/domain/data-set'
import { generateCertificatesAction } from '@/backend/infrastructure/server-actions/generate-certificates-action'
import { AlertMessage } from '@/components/ui/alert-message'
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
import { toast } from 'sonner'

interface GenerateCertificatesSectionProps {
    certificateId: string
    allVariablesWereMapped: boolean
    dataSet: {
        id: string
        rows: Record<string, any>[]
        generationStatus: GENERATION_STATUS | null
    } | null
    emailSent: boolean
}

export function GenerateCertificatesSection({
    certificateId,
    allVariablesWereMapped,
    dataSet,
    emailSent,
}: GenerateCertificatesSectionProps) {
    const [state, action, isGeneratePending] = useActionState(
        generateCertificatesAction,
        null,
    )

    // useDataSetPolling(dataSet?.id || null, {
    //     enabled: dataSet?.generationStatus === GENERATION_STATUS.PENDING,
    // })

    const router = useRouter()

    useDataSetSSE(
        dataSet?.id || null,
        dataSet?.generationStatus === GENERATION_STATUS.PENDING,
        data => {
            if (data.generationStatus) {
                if (data.generationStatus === GENERATION_STATUS.COMPLETED) {
                    toast.success('Certificados gerados com sucesso')
                }

                router.refresh()
            }
        },
    )

    const handleGenerate = async () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)

        startTransition(() => {
            action(formData)
        })
    }

    useEffect(() => {
        if (!state) return

        if (!state.success) {
            toast.error(state.message)
        }
    }, [state])

    const totalRecords = dataSet?.rows.length || 0
    const certificatesWereGenerated =
        dataSet?.generationStatus === GENERATION_STATUS.COMPLETED

    const isPending =
        isGeneratePending ||
        dataSet?.generationStatus === GENERATION_STATUS.PENDING

    const certificatesGenerationFailed =
        dataSet?.generationStatus === GENERATION_STATUS.FAILED

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
                    <AlertMessage
                        variant="success"
                        icon={<CheckCircle2 className="size-5" />}
                        text={`
                            ${totalRecords}
                            ${totalRecords !== 1 ? 'certificados' : 'certificado'}
                            ${totalRecords !== 1 ? 'gerados' : 'gerado'}
                            com sucesso
                        `}
                        description={
                            <p>
                                Você pode visualiza-
                                {totalRecords !== 1 ? 'los' : 'lo'}
                                ou baixa-{totalRecords !== 1 ? 'los' : 'lo'}
                                na seção de{' '}
                                <span
                                    className="cursor-pointer underline"
                                    onClick={() => {
                                        const el = document.getElementById(
                                            'data-source-section',
                                        )
                                        el?.scrollIntoView({
                                            behavior: 'smooth',
                                        })
                                    }}
                                >
                                    Fonte de Dados
                                </span>
                            </p>
                        }
                    />
                )}

                {certificatesGenerationFailed && (
                    <AlertMessage
                        variant="error"
                        icon={<CircleAlert className="size-5" />}
                        text="A geração de certificados anterior falhou. Tente novamente."
                    />
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
                        disabled={
                            certificatesWereGenerated || isPending || emailSent
                        }
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Gerando...
                            </>
                        ) : (
                            <>
                                <FileCheck className="h-4 w-4" />
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

export function useDataSetSSE(
    dataSetId: string | null,
    enabled: boolean,
    onEvent?: (data: any) => void,
) {
    useEffect(() => {
        if (!dataSetId || !enabled) return

        const eventSource = new EventSource(
            `/api/data-sets/${dataSetId}/events`,
        )

        eventSource.onmessage = event => {
            const data = JSON.parse(event.data)
            console.log('Evento SSE:', data)
            onEvent?.(data)
        }

        eventSource.onerror = err => {
            console.error('Erro SSE:', err)
            eventSource.close()
        }

        return () => eventSource.close()
    }, [dataSetId, enabled, onEvent])
}
