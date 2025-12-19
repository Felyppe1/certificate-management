'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { RefreshCw, Edit3, Trash2, ALargeSmall } from 'lucide-react'
import { startTransition, useActionState, useEffect, useState } from 'react'
import { refreshTemplateAction } from '@/backend/infrastructure/server-actions/refresh-template-action'
import { deleteTemplateAction } from '@/backend/infrastructure/server-actions/delete-template-action'
import { downloadTemplateAction } from '@/backend/infrastructure/server-actions/download-template-action'
import { INPUT_METHOD } from '@/backend/domain/certificate'
import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'
import { SourceIcon } from '@/components/svg/SourceIcon'
import { RegenerateWarningPopover } from '../RegenerateWarningDialog'
import { toast } from 'sonner'

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

interface TemplateDisplayProps {
    template: {
        driveFileId: string | null
        storageFileUrl: string | null
        inputMethod: INPUT_METHOD
        fileName: string
        fileExtension: TEMPLATE_FILE_EXTENSION
        variables: string[]
        thumbnailUrl: string | null
    }
    certificateId: string
    onEdit: () => void
    isDisabled: boolean
    certificatesGenerated: boolean
}

export function TemplateDisplay({
    template,
    certificateId,
    onEdit,
    isDisabled,
    certificatesGenerated,
}: TemplateDisplayProps) {
    const [showRefreshWarning, setShowRefreshWarning] = useState(false)
    const [showEditWarning, setShowEditWarning] = useState(false)

    const [refreshState, refreshAction, isRefreshing] = useActionState(
        refreshTemplateAction,
        null,
    )

    const [deleteState, deleteAction, isDeleting] = useActionState(
        deleteTemplateAction,
        null,
    )

    const [
        downloadTemplateState,
        downloadTemplateActionHandler,
        isDownloadingTemplate,
    ] = useActionState(downloadTemplateAction, null)

    const handleRefresh = () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)

        startTransition(() => {
            refreshAction(formData)
        })
    }

    const handleRemoveTemplate = () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)

        startTransition(() => {
            deleteAction(formData)
        })
    }

    const handleDownloadTemplate = () => {
        const formData = new FormData()
        formData.append('certificateEmissionId', certificateId)

        startTransition(() => {
            downloadTemplateActionHandler(formData)
        })
    }

    const handleViewFile = () => {
        if (template.inputMethod === 'UPLOAD') {
            handleDownloadTemplate()
        } else if (template.driveFileId) {
            const driveUrl = `https://drive.google.com/file/d/${template.driveFileId}/view`
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

    useEffect(() => {
        if (!refreshState) return

        if (refreshState.success) {
            toast.success(refreshState.message)
        } else {
            toast.error(refreshState.message)
        }
    }, [refreshState])

    useEffect(() => {
        if (!deleteState) return

        if (deleteState.success) {
            toast.success(deleteState.message)
        } else {
            toast.error(deleteState.message)
        }
    }, [deleteState])

    useEffect(() => {
        if (!downloadTemplateState) return

        if (downloadTemplateState.success) {
            const signedUrl = downloadTemplateState.data!

            window.open(signedUrl, '_blank', 'noopener,noreferrer')
        } else {
            toast.error(downloadTemplateState.message)
        }
    }, [downloadTemplateState])

    return (
        <>
            <div className="space-y-4">
                <Card className="">
                    <CardHeader className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-0">
                        <div>
                            <CardTitle>Template</CardTitle>
                            <CardDescription>
                                Template utilizado para gerar os certificados
                            </CardDescription>
                        </div>

                        <div className="flex flex-wrap justify-start sm:justify-end gap-2 min-w-[15rem]">
                            {template.inputMethod !== 'UPLOAD' && (
                                <RegenerateWarningPopover
                                    open={showRefreshWarning}
                                    onOpenChange={setShowRefreshWarning}
                                    onConfirm={handleRefresh}
                                    title="Atualizar template?"
                                >
                                    <Button
                                        variant="outline"
                                        onClick={handleRefreshClick}
                                        disabled={
                                            isRefreshing ||
                                            isDeleting ||
                                            isDisabled
                                        }
                                    >
                                        <RefreshCw
                                            className={`scale-80 ${isRefreshing ? 'animate-spin' : ''}`}
                                        />
                                        {isRefreshing
                                            ? 'Atualizando...'
                                            : 'Atualizar'}
                                    </Button>
                                </RegenerateWarningPopover>
                            )}

                            <RegenerateWarningPopover
                                open={showEditWarning}
                                onOpenChange={setShowEditWarning}
                                onConfirm={onEdit}
                                title="Editar template?"
                            >
                                <Button
                                    variant="outline"
                                    onClick={handleEditClick}
                                    disabled={
                                        isRefreshing || isDeleting || isDisabled
                                    }
                                >
                                    <Edit3 className="scale-80" />
                                    Editar
                                </Button>
                            </RegenerateWarningPopover>
                            <Button
                                variant="outline"
                                onClick={handleRemoveTemplate}
                                disabled={
                                    isDeleting || isRefreshing || isDisabled
                                }
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="scale-80" />
                                {isDeleting ? 'Removendo...' : 'Remover'}
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="flex flex-row gap-10">
                        {/* {template.thumbnailUrl ? (
                        <img
                            src={template.thumbnailUrl || ''}
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
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <ALargeSmall className="size-4 sm:size-4 sm: text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-muted-foreground mb-1">
                                            Nome do arquivo
                                        </p>
                                        <p className="font-medium truncate">
                                            {template.fileName}
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
                                                    template.inputMethod,
                                                )}
                                            </p>
                                            {template.inputMethod ===
                                            'UPLOAD' ? (
                                                <Button
                                                    variant="default"
                                                    onClick={handleViewFile}
                                                    size="sm"
                                                    disabled={
                                                        isDownloadingTemplate
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
                                                    {isDownloadingTemplate
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
                                        <span className="font-mono font-semibold text-muted-foreground">
                                            {'{}'}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-muted-foreground mb-1">
                                            Variáveis do Template
                                        </p>
                                        <div className="mt-3">
                                            {template.variables.length === 0 ? (
                                                <p>
                                                    Nenhuma variável encontrada
                                                </p>
                                            ) : (
                                                template.variables.map(
                                                    (variable, index) => (
                                                        <Badge
                                                            key={index}
                                                            className="font-mono mr-2 mb-2 bg-muted text-accent-foreground"
                                                        >
                                                            {`{{ ${variable} }}`}
                                                        </Badge>
                                                    ),
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Info box - mais discreto */}
                {/* {template.variables.length > 0 && (
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
                                Como funcionam as variáveis
                            </p>
                            <p className="text-muted-foreground">
                                As variáveis no formato{' '}
                                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{`{{variavel}}`}</code>{' '}
                                serão substituídas automaticamente pelos dados
                                reais durante a geração dos certificados.
                            </p>
                        </div>
                    </div>
                </div>
            )} */}
            </div>
        </>
    )
}
