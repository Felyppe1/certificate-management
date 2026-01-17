'use client'

import { PROCESSING_STATUS_ENUM } from '@/backend/domain/data-source-row'
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
import { useSSE } from '@/custom-hooks/use-sse'
import { FileCheck, Loader2, CheckCircle2, CircleAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
    startTransition,
    useActionState,
    useEffect,
    useRef,
    useState,
} from 'react'
import { toast } from 'sonner'

interface GenerateCertificatesSectionProps {
    certificateId: string
    allVariablesWereMapped: boolean
    rows: {
        id: string
        processingStatus: PROCESSING_STATUS_ENUM
    }[]
    emailSent: boolean
    certificatesGenerated: boolean
}

export function GenerateCertificatesSection({
    certificateId,
    allVariablesWereMapped,
    rows,
    emailSent,
    certificatesGenerated,
}: GenerateCertificatesSectionProps) {
    const [state, action, isGeneratePending] = useActionState(
        generateCertificatesAction,
        null,
    )

    const router = useRouter()
    const [completedRows, setCompletedRows] = useState(0)

    let isGenerating = false

    let totalRows = 0
    let failedRows = 0
    let successRows = 0

    rows.forEach(row => {
        if (row.processingStatus === PROCESSING_STATUS_ENUM.COMPLETED) {
            successRows += 1
        } else if (row.processingStatus === PROCESSING_STATUS_ENUM.FAILED) {
            failedRows += 1
        } else if (
            row.processingStatus === PROCESSING_STATUS_ENUM.RUNNING &&
            !isGenerating
        ) {
            isGenerating = true
        }

        totalRows += 1
    })

    const handleGenerate = async () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)

        startTransition(() => {
            action(formData)
        })
    }

    // Reset progress when starting a new generation
    useEffect(() => {
        if (isGeneratePending) {
            setCompletedRows(0)
        }
    }, [isGeneratePending])

    useSSE(`/api/certificate-emissions/${certificateId}/events`, {
        onEvent: data => {
            if (data.type === 'row-completed') {
                setCompletedRows(prev => {
                    const newCount = prev + 1

                    return newCount
                })
            }
        },
        enabled: isGenerating,
    })

    useEffect(() => {
        if (completedRows === totalRows) {
            toast.success('A geração de certificados finalizou')
            router.refresh()
        }
    }, [completedRows, totalRows, router])

    useEffect(() => {
        if (!state) return

        if (!state.success) {
            if (state.errorType === 'no-data-set-rows') {
                toast.error(
                    'Não há linhas na fonte de dados para gerar certificados',
                )
            } else {
                toast.error('Ocorreu um erro ao gerar os certificados')
            }
        }
    }, [state])

    const isPending = isGeneratePending || isGenerating

    const progressPercentage =
        totalRows > 0 ? (completedRows / totalRows) * 100 : 0

    return (
        <Card>
            <CardHeader>
                <CardTitle>Geração de Certificados</CardTitle>
                <CardDescription>
                    Gere os arquivos do certificado para todos os participantes
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    {successRows > 0 && (
                        <AlertMessage
                            variant="success"
                            icon={<CheckCircle2 />}
                            text={`
                                ${totalRows}
                                ${totalRows !== 1 ? 'certificados' : 'certificado'}
                                ${totalRows !== 1 ? 'gerados' : 'gerado'}
                                com sucesso
                            `}
                            // description={
                            //     <p>
                            //         Você pode visualiza-
                            //         {totalRows !== 1 ? 'los' : 'lo'} ou baixa-
                            //         {totalRows !== 1 ? 'los' : 'lo'} na seção de{' '}
                            //         <span
                            //             className="cursor-pointer underline"
                            //             onClick={() => {
                            //                 const el = document.getElementById(
                            //                     'data-source-section',
                            //                 )
                            //                 el?.scrollIntoView({
                            //                     behavior: 'smooth',
                            //                 })
                            //             }}
                            //         >
                            //             Fonte de Dados
                            //         </span>
                            //     </p>
                            // }
                        />
                    )}

                    {failedRows > 0 && failedRows !== totalRows && (
                        <AlertMessage
                            variant="error"
                            icon={<CircleAlert />}
                            text={`${failedRows} ${failedRows !== 1 ? 'gerações de certificados falharam' : 'geração de certificado falhou'}.`}
                        />
                    )}
                </div>

                {failedRows > 0 && failedRows === totalRows && (
                    <AlertMessage
                        variant="error"
                        icon={<CircleAlert />}
                        text={`Todas as gerações de certificados falharam.`}
                    />
                )}

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

                {totalRows === 0 && (
                    <AlertMessage
                        variant="warning"
                        icon={<CheckCircle2 />}
                        text={`É necessário pelo menos 1 linha na fonte de dados para gerar os certificados agora`}
                    />
                )}

                {isGenerating && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Gerando certificados...</span>
                            <span>
                                {completedRows} de {totalRows}
                            </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex gap-4 items-center justify-between flex-wrap p-6 py-4 sm:py-6 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                            <FileCheck className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div>
                            <p className="font-medium text-base sm:text-lg">
                                {totalRows}{' '}
                                {totalRows === 1
                                    ? 'certificado'
                                    : 'certificados'}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                {certificatesGenerated ? (
                                    <p>
                                        {totalRows === 1
                                            ? 'Processado'
                                            : 'Processados'}
                                        . Veja os detalhes na seção de{' '}
                                        <span
                                            className="cursor-pointer underline"
                                            onClick={() => {
                                                const el =
                                                    document.getElementById(
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
                                ) : totalRows === 1 ? (
                                    'será gerado'
                                ) : (
                                    'serão gerados'
                                )}
                            </p>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        onClick={handleGenerate}
                        disabled={
                            certificatesGenerated ||
                            isPending ||
                            emailSent ||
                            totalRows === 0
                        }
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processando...
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
    onComplete?: (status: PROCESSING_STATUS_ENUM) => void
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
                    dataSet.processingStatus !==
                        PROCESSING_STATUS_ENUM.PENDING &&
                    dataSet.processingStatus !== PROCESSING_STATUS_ENUM.RUNNING

                if (isComplete) {
                    onComplete?.(dataSet.processingStatus)
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
