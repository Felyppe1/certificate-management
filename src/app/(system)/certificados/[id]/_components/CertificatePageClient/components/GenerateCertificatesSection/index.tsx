'use client'

import { PROCESSING_STATUS_ENUM } from '@/backend/domain/data-source-row'
import { generateCertificatesAction } from '@/backend/infrastructure/server-actions/generate-certificates-action'
import { retryCertificatesGenerationAction } from '@/backend/infrastructure/server-actions/retry-certificates-generation-action'
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
import {
    FileCheck,
    Loader2,
    CheckCircle2,
    CircleAlert,
    RefreshCw,
    FilePlay,
    File,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

interface GenerateCertificatesSectionProps {
    certificateId: string
    allVariablesWereMapped: boolean
    rows: {
        id: string
        processingStatus: PROCESSING_STATUS_ENUM
    }[]
    emailSent: boolean
}

export function GenerateCertificatesSection({
    certificateId,
    allVariablesWereMapped,
    rows,
    emailSent,
}: GenerateCertificatesSectionProps) {
    const queryClient = useQueryClient()
    const [completedRows, setCompletedRows] = useState(0)
    const [retryCompletedRows, setRetryCompletedRows] = useState(0)
    const [totalRetryingRows, setTotalRetryingRows] = useState(0)

    let isGenerating = false
    let isRetrying = false

    let totalRows = 0
    let failedRows = 0
    let successRows = 0
    let retryingRows = 0

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
        } else if (row.processingStatus === PROCESSING_STATUS_ENUM.RETRYING) {
            retryingRows += 1
            if (!isRetrying) {
                isRetrying = true
            }
        }

        totalRows += 1
    })

    const certificatesGenerated =
        successRows + failedRows + retryingRows === totalRows && totalRows > 0

    const generateMutation = useMutation({
        mutationFn: async () => {
            const formData = new FormData()
            formData.append('certificateId', certificateId)
            const result = await generateCertificatesAction(null, formData)
            if (!result?.success) throw result
            return result
        },
        onMutate: () => {
            setCompletedRows(0)
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.certificateEmission(certificateId),
            })
            await queryClient.invalidateQueries({
                queryKey: queryKeys.me(),
            })
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return

            if (error?.errorType === 'no-data-set-rows') {
                toast.error(
                    'Não há linhas na fonte de dados para gerar certificados',
                )
            } else if (error?.errorType === 'insufficient-credits') {
                toast.error(
                    'Créditos insuficientes para gerar os certificados. Aguarde até amanhã para seus créditos renovarem.',
                )
            } else {
                toast.error('Ocorreu um erro ao gerar os certificados')
            }
        },
    })

    const retryMutation = useMutation({
        mutationFn: async () => {
            const formData = new FormData()
            formData.append('certificateId', certificateId)
            setRetryCompletedRows(0)
            const result = await retryCertificatesGenerationAction(
                null,
                formData,
            )
            if (!result?.success) throw result
            return result
        },
        onSuccess: async data => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.certificateEmission(certificateId),
            })
            if (data?.data) {
                setTotalRetryingRows(data.data.totalRetrying)
            }
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return

            if (error?.errorType === 'no-failed-data-source-rows') {
                toast.error('Não há certificados com falha para reprocessar')
            } else {
                toast.error(
                    'Ocorreu um erro ao tentar reprocessar os certificados',
                )
            }
        },
    })

    useSSE(`/api/certificate-emissions/${certificateId}/events`, {
        onEvent: data => {
            if (data.type === 'row-completed') {
                if (isRetrying) {
                    setRetryCompletedRows(prev => prev + 1)
                } else {
                    setCompletedRows(prev => prev + 1)
                }
            }
        },
        enabled: isGenerating || isRetrying,
    })

    useEffect(() => {
        if (completedRows === totalRows && totalRows > 0 && completedRows > 0) {
            toast.success('A geração de certificados finalizou')
            queryClient.invalidateQueries({
                queryKey: queryKeys.certificateEmission(certificateId),
            })
            queryClient.invalidateQueries({
                queryKey: queryKeys.me(),
            })
        }
    }, [completedRows, totalRows])

    // Handle retry completion
    useEffect(() => {
        if (
            isRetrying &&
            totalRetryingRows > 0 &&
            retryCompletedRows === totalRetryingRows
        ) {
            toast.success(
                'O reprocessamento dos certificados que falharam finalizou',
            )
            queryClient.invalidateQueries({
                queryKey: queryKeys.certificateEmission(certificateId),
            })
        }
    }, [retryCompletedRows, totalRetryingRows, isRetrying])

    const isPending = generateMutation.isPending || isGenerating
    const isRetryProcessing = retryMutation.isPending || isRetrying

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
                                ${successRows}
                                ${successRows !== 1 ? 'certificados' : 'certificado'}
                                ${successRows !== 1 ? 'gerados' : 'gerado'}
                                com sucesso
                            `}
                        />
                    )}

                    {failedRows > 0 && failedRows !== totalRows && (
                        <AlertMessage
                            variant="error"
                            icon={<CircleAlert />}
                            text={`${failedRows} ${failedRows !== 1 ? 'gerações de certificados falharam' : 'geração de certificado falhou'}.`}
                            actionLayout="start"
                            action={
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => retryMutation.mutate()}
                                    disabled={isRetryProcessing || isPending}
                                    className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
                                >
                                    {retryMutation.isPending ? (
                                        <>
                                            <Loader2 className="scale-90 h-3 w-3 animate-spin" />
                                            Iniciando...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="scale-90 h-3 w-3" />
                                            Tentar novamente
                                        </>
                                    )}
                                </Button>
                            }
                        />
                    )}

                    {retryingRows > 0 && (
                        <AlertMessage
                            variant="error"
                            icon={<CircleAlert />}
                            text={`Reprocessando ${retryingRows} ${retryingRows !== 1 ? 'certificados' : 'certificado'}...`}
                            actionLayout="start"
                            action={
                                <div className="flex items-center gap-2 bg-red-200/50 dark:bg-red-900/30 px-3 py-1 rounded-full border border-red-200 dark:border-red-800">
                                    <span className="text-xs font-semibold tabular-nums text-red-800 dark:text-red-200">
                                        {retryCompletedRows} / {retryingRows}
                                    </span>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-red-600 dark:text-red-400" />
                                </div>
                            }
                        />
                    )}
                </div>

                {failedRows > 0 && failedRows === totalRows && (
                    <AlertMessage
                        variant="error"
                        icon={<CircleAlert />}
                        text={`Todas as gerações de certificados falharam.`}
                        action={
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => retryMutation.mutate()}
                                disabled={isRetryProcessing || isPending}
                                className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
                            >
                                {retryMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Iniciando...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-3 w-3" />
                                        Tentar novamente
                                    </>
                                )}
                            </Button>
                        }
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
                            <File className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
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
                        onClick={() => generateMutation.mutate()}
                        disabled={
                            certificatesGenerated ||
                            isPending ||
                            emailSent ||
                            totalRows === 0
                        }
                    >
                        {isPending ? (
                            <>
                                <Loader2 className=" animate-spin" />
                                Processando...
                            </>
                        ) : certificatesGenerated ? (
                            <>
                                <FileCheck className="" />
                                Geração Finalizada
                            </>
                        ) : (
                            <>
                                <FilePlay className="" />
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
    const queryClient = useQueryClient()
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
                    dataSet.processingStatus !==
                        PROCESSING_STATUS_ENUM.RUNNING &&
                    dataSet.processingStatus !== PROCESSING_STATUS_ENUM.RETRYING

                if (isComplete) {
                    onComplete?.(dataSet.processingStatus)

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
    }, [dataSetId, enabled, onComplete, queryClient])
}
