'use client'

import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    RefreshCw,
    Edit3,
    Trash2,
    Download,
    Columns2,
    Table2,
    ALargeSmall,
    Eye,
    RotateCw,
    Loader2,
} from 'lucide-react'
import { startTransition, useActionState, useEffect, useState } from 'react'
import { INPUT_METHOD } from '@/backend/domain/certificate'
import {
    DATA_SOURCE_MIME_TYPE,
    ColumnType,
    MAX_DATA_SOURCE_ROWS,
} from '@/backend/domain/data-source'
import { deleteDataSourceAction } from '@/backend/infrastructure/server-actions/delete-data-source-action'
import { refreshDataSourceAction } from '@/backend/infrastructure/server-actions/refresh-data-source-action'
import { retryDataSourceRowAction } from '@/backend/infrastructure/server-actions/retry-data-source-row-action'
import { SourceIcon } from '@/components/svg/SourceIcon'
import { PROCESSING_STATUS_ENUM } from '@/backend/domain/data-source-row'
import { WarningPopover } from '../../../../../../../../components/WarningPopover'
import { toast } from 'sonner'

import { downloadDataSourceAction } from '@/backend/infrastructure/server-actions/download-data-source-action'
import { ConfigurableDataSourceTable } from './components/ConfigurableDataSourceTable'
import { useGoogleRelogin } from '@/components/useGoogleRelogin'

function getInputMethodLabel(method: string) {
    switch (method) {
        case 'URL':
            return 'Link do Google'
        case 'GOOGLE_DRIVE':
            return 'Google Drive'
        case 'UPLOAD':
            return 'Upload Local'
        default:
            return method
    }
}

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))

    return `${size} ${sizes[i]}`
}

interface DataSourceDisplayProps {
    dataSource: {
        driveFileId: string | null
        storageFileUrl: string | null
        inputMethod: INPUT_METHOD
        fileName: string
        fileMimeType: DATA_SOURCE_MIME_TYPE
        columns: {
            name: string
            type: ColumnType
            arraySeparator: string | null
        }[]
        thumbnailUrl: string | null
        rows: {
            id: string
            processingStatus: PROCESSING_STATUS_ENUM
            fileBytes: number | null
            data: Record<string, any>
        }[]
    }
    certificateId: string
    onEdit: () => void
    isDisabled: boolean
    userEmail: string
}

export function DataSourceDisplay({
    dataSource,
    certificateId,
    onEdit,
    isDisabled,
    userEmail,
}: DataSourceDisplayProps) {
    const [showAllRows, setShowAllRows] = useState(false)
    const [showRefreshWarning, setShowRefreshWarning] = useState(false)
    const [showEditWarning, setShowEditWarning] = useState(false)

    const [refreshState, refreshAction, isRefreshing] = useActionState(
        refreshDataSourceAction,
        null,
    )

    const [deleteState, deleteAction, isDeleting] = useActionState(
        deleteDataSourceAction,
        null,
    )

    const [
        downloadDataSourceState,
        downloadDataSourceActionHandler,
        isDownloadingDataSource,
    ] = useActionState(downloadDataSourceAction, null)

    const [retryState, retryActionHandler, isRetrying] = useActionState(
        retryDataSourceRowAction,
        null,
    )

    const { login, isLoading: loginIsLoading } = useGoogleRelogin({
        userEmail,
        onFinished: () => {
            toast.success(
                'Reautenticação bem-sucedida. Por favor, tente atualizar o template novamente.',
            )
        },
    })

    const handleRefresh = () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)

        startTransition(() => {
            refreshAction(formData)
        })
    }

    const handleRemoveDataSource = () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)

        startTransition(() => {
            deleteAction(formData)
        })
    }

    const handleDownloadDataSource = () => {
        const formData = new FormData()
        formData.append('certificateEmissionId', certificateId)

        startTransition(() => {
            downloadDataSourceActionHandler(formData)
        })
    }

    const handleViewFile = () => {
        if (dataSource.inputMethod === 'UPLOAD') {
            handleDownloadDataSource()
        } else if (dataSource.driveFileId) {
            const driveUrl = `https://drive.google.com/file/d/${dataSource.driveFileId}/view`
            window.open(driveUrl, '_blank')
        }
    }

    const handleRefreshClick = () => {
        if (certificatesGenerated) {
            setShowRefreshWarning(true)
        } else {
            handleRefresh()
        }
    }

    const handleEditClick = () => {
        if (certificatesGenerated) {
            setShowEditWarning(true)
        } else {
            onEdit()
        }
    }

    const handleDownloadAllCertificates = () => {
        const url = `/api/certificate-emissions/${certificateId}/zip`

        // The browser notices the header "attachment" and starts the download in the same pathe without reloading
        window.location.href = url
    }

    const handleRetry = (rowId: string) => {
        const formData = new FormData()
        formData.append('rowId', rowId)

        startTransition(() => {
            retryActionHandler(formData)
        })
    }

    useEffect(() => {
        if (!retryState) return

        if (retryState.success) {
            toast.success('Reprocessamento iniciado')
        } else {
            toast.error('Erro ao tentar reprocessar o registro')
        }
    }, [retryState])

    useEffect(() => {
        if (!refreshState) return

        if (refreshState.success) {
            toast.success('Fonte de dados atualizada com sucesso')
        } else {
            if (refreshState.errorType === 'drive-file-not-found') {
                toast.error(
                    'Arquivo não encontrado. Verifique se ele se existe no Drive, se você tem permissão para acessá-lo ou se ele está público',
                )
            } else if (refreshState.errorType === 'google-session-expired') {
                toast.error(
                    'Sessão do Google expirada. Entre novamente com a sua conta.',
                )
                login()
            } else if (refreshState.errorType === 'data-source-rows-exceeded') {
                toast.error(
                    `A fonte de dados não pode ter mais de ${MAX_DATA_SOURCE_ROWS} linhas`,
                )
            } else {
                toast.error(
                    'Ocorreu um erro ao tentar atualizar a fonte de dados',
                )
            }
        }
    }, [refreshState])

    useEffect(() => {
        if (!deleteState) return

        if (deleteState.success) {
            toast.success('Fonte de dados removida com sucesso')
        } else {
            toast.error('Ocorreu um erro ao deletar a fonte de dados')
        }
    }, [deleteState])

    useEffect(() => {
        if (!downloadDataSourceState) return

        if (downloadDataSourceState.success) {
            const signedUrl = downloadDataSourceState.data!

            window.open(signedUrl, '_blank', 'noopener,noreferrer')
        } else {
            toast.error('Ocorreu um erro ao tentar baixar a fonte de dados')
        }
    }, [downloadDataSourceState])

    const rows = dataSource.rows
    const certificatesGenerated =
        rows.length > 0 &&
        rows.every(
            row =>
                row.processingStatus === PROCESSING_STATUS_ENUM.COMPLETED ||
                row.processingStatus === PROCESSING_STATUS_ENUM.FAILED ||
                row.processingStatus === PROCESSING_STATUS_ENUM.RETRYING,
        )

    return (
        <>
            <Card className="" id="data-source-section">
                <CardHeader className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-0">
                    <div>
                        <CardTitle>Fonte de Dados</CardTitle>
                        <CardDescription>
                            Fonte de dados utilizada para gerar os certificados
                        </CardDescription>
                    </div>

                    <div className="flex flex-wrap justify-start sm:justify-end gap-2 min-w-[15rem]">
                        {dataSource.inputMethod !== 'UPLOAD' && (
                            <WarningPopover
                                open={showRefreshWarning}
                                onOpenChange={setShowRefreshWarning}
                                onConfirm={handleRefresh}
                                description="Você precisará gerar os certificados novamente após esta ação."
                                title="Atualizar fonte de dados?"
                            >
                                <Button
                                    variant="outline"
                                    onClick={handleRefreshClick}
                                    disabled={
                                        isRefreshing ||
                                        isDeleting ||
                                        isDisabled ||
                                        loginIsLoading
                                    }
                                >
                                    <RefreshCw
                                        className={`scale-80 ${isRefreshing ? 'animate-spin' : ''}`}
                                    />
                                    {isRefreshing
                                        ? 'Atualizando...'
                                        : 'Atualizar'}
                                </Button>
                            </WarningPopover>
                        )}

                        <WarningPopover
                            open={showEditWarning}
                            onOpenChange={setShowEditWarning}
                            onConfirm={onEdit}
                            description="Você precisará gerar os certificados novamente após esta ação."
                            title="Editar fonte de dados?"
                        >
                            <Button
                                variant="outline"
                                onClick={handleEditClick}
                                disabled={
                                    isRefreshing ||
                                    isDeleting ||
                                    isDisabled ||
                                    loginIsLoading
                                }
                            >
                                <Edit3 className="scale-80" />
                                Editar
                            </Button>
                        </WarningPopover>
                        <Button
                            variant="outline"
                            onClick={handleRemoveDataSource}
                            disabled={
                                isDeleting ||
                                isRefreshing ||
                                isDisabled ||
                                loginIsLoading
                            }
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="scale-80" />
                            {isDeleting ? 'Removendo...' : 'Remover'}
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex flex-row gap-10">
                    {/* {dataSource.thumbnailUrl ? (
                        <img
                            src={dataSource.thumbnailUrl || ''}
                            alt=""
                            className="aspect-3/2 w-full max-w-[25rem] object-cover object-top"
                        />
                    ) : (
                        <div className="aspect-3/2 w-full max-w-[25rem] rounded-md bg-muted flex justify-center items-center text-muted-foreground">
                            Gerando miniatura...
                        </div>
                    )} */}

                    <div className="flex flex-col w-full text-sm sm:text-base">
                        <div className="flex flex-col gap-4 mt-1">
                            {/* File Info */}
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <ALargeSmall className="size-4 sm:size-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-muted-foreground mb-1">
                                        Nome do arquivo
                                    </p>
                                    <p className="font-medium truncate">
                                        {dataSource.fileName}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <SourceIcon className="size-4 sm:size-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-muted-foreground mb-1">
                                        Fonte
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <p className="font-medium">
                                            {getInputMethodLabel(
                                                dataSource.inputMethod,
                                            )}
                                        </p>
                                        {dataSource.inputMethod === 'UPLOAD' ? (
                                            <Button
                                                variant="default"
                                                onClick={handleViewFile}
                                                size="sm"
                                                disabled={
                                                    isDownloadingDataSource
                                                }
                                            >
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                                                </svg>
                                                {isDownloadingDataSource
                                                    ? 'Baixando...'
                                                    : 'Baixar'}
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={handleViewFile}
                                            >
                                                <svg
                                                    className=""
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                                                </svg>
                                                Abrir
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <Table2 className="size-4 sm:size-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-muted-foreground mb-1">
                                        Conteúdo
                                    </p>
                                    <div className="mt-3">
                                        {dataSource.columns.length === 0 ? (
                                            <p>Nenhuma coluna encontrada</p>
                                        ) : (
                                            <ConfigurableDataSourceTable
                                                certificateId={certificateId}
                                                rows={rows}
                                                columns={dataSource.columns}
                                                certificatesGenerated={
                                                    certificatesGenerated
                                                }
                                                handleDownloadAllCertificates={
                                                    handleDownloadAllCertificates
                                                }
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Info box - mais discreto */}
            {/* {dataSource.columns.length > 0 && (
                <div className="bg-muted/50 backdrop-blur-sm border rounded-lg p-4">
                    <div className="flex gap-3">
                        <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
                            <svg
                                className="w-5 h-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 16v-4M12 8h.01" />
                            </svg>
                        </div>
                        <div className="text-sm space-y-1">
                            <p className="font-medium">
                                Como funcionam as colunas
                            </p>
                            <p className="text-muted-foreground">
                                As colunas representam os dados que serão utilizados para preencher os certificados.
                            </p>
                        </div>
                    </div>
                </div>
            )} */}
        </>
    )
}
