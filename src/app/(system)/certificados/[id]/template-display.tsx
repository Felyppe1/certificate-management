'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardHeader,
    CardContent,
    CardDescription,
    CardTitle,
} from '@/components/ui/card'
import { RefreshCw, Edit3, Trash2 } from 'lucide-react'
import { useState, startTransition, useActionState, useEffect } from 'react'
import { FileSelector } from '@/components/FileSelector'
import { refreshTemplateByUrlAction } from '@/backend/infrastructure/server-actions/refresh-template-by-url-action'
import { deleteTemplateAction } from '@/backend/infrastructure/server-actions/delete-template-action'

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
        id: string
        driveFileId: string | null
        storageFileUrl: string | null
        inputMethod: string
        fileName: string
        fileExtension: string
        variables: string[]
    }
    certificateId: string
    googleOAuthToken: string | null
    onSubmitDrive: (fileId: string) => void
    onSubmitUrl: (formData: FormData) => void
    isAnySubmitionLoading: boolean
    drivePickerState: {
        success: boolean
        message: string
    } | null
    urlState: {
        success: boolean
        message: string
    } | null
}

export function TemplateDisplay({
    template,
    certificateId,
    googleOAuthToken,
    onSubmitDrive,
    onSubmitUrl,
    isAnySubmitionLoading,
    drivePickerState,
    urlState,
}: TemplateDisplayProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [, refreshAction, isRefreshing] = useActionState(
        refreshTemplateByUrlAction,
        null,
    )

    const [, deleteAction, isDeleting] = useActionState(
        deleteTemplateAction,
        null,
    )

    const handleRefresh = () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)

        startTransition(() => {
            refreshAction(formData)
        })
    }

    const handleEdit = () => {
        setIsEditing(true)
    }

    const handleCancelEdit = () => {
        setIsEditing(false)
    }

    const handleRemoveTemplate = () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)

        startTransition(() => {
            deleteAction(formData)
        })
    }

    useEffect(() => {
        if (!urlState) return

        if (urlState.success) {
            // TODO: show success message
            setIsEditing(false)
        }

        // TODO: show error message
    }, [urlState])

    useEffect(() => {
        if (!drivePickerState) return

        if (drivePickerState.success) {
            // TODO: show success message
            setIsEditing(false)
        }

        // TODO: show error message
    }, [drivePickerState])

    if (isEditing) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {/* <FileText className="h-5 w-5" /> */}
                            Selecionar Novo Template
                        </CardTitle>
                        <CardDescription>
                            Escolha um novo template para substituir o atual
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2 mb-4">
                            <Button
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={
                                    isRefreshing ||
                                    isDeleting ||
                                    isAnySubmitionLoading
                                }
                            >
                                Cancelar
                            </Button>
                        </div>
                        <FileSelector
                            googleOAuthToken={googleOAuthToken}
                            onSubmitDrive={onSubmitDrive}
                            onSubmitUrl={onSubmitUrl}
                            isLoading={
                                isRefreshing ||
                                isDeleting ||
                                isAnySubmitionLoading
                            }
                        />
                    </CardContent>
                </Card>
            </div>
        )
    }

    const handleViewFile = () => {
        if (template.inputMethod === 'UPLOAD' && template.storageFileUrl) {
            window.open(template.storageFileUrl, '_blank')
        } else if (template.driveFileId) {
            const driveUrl = `https://drive.google.com/file/d/${template.driveFileId}/view`
            window.open(driveUrl, '_blank')
        }
    }

    const getPreviewGradient = () => {
        if (
            template.fileExtension === 'DOCX' ||
            template.fileExtension === 'GOOGLE_DOCS'
        ) {
            return 'from-blue-500 to-blue-600'
        } else {
            return 'from-orange-500 to-orange-600'
        }
    }

    const getPreviewIcon = () => {
        if (
            template.fileExtension === 'DOCX' ||
            template.fileExtension === 'GOOGLE_DOCS'
        ) {
            return (
                <svg
                    className="w-16 h-16 text-white drop-shadow-lg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10,19H8V16H10V19M10,15H8V12H10V15M10,11H8V8H10V11M16,19H12V18H16V19M16,17H12V16H16V17M16,15H12V14H16V15M16,13H12V12H16V13M16,11H12V10H16V11Z" />
                </svg>
            )
        } else {
            return (
                <svg
                    className="w-16 h-16 text-white drop-shadow-lg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M6,20H15L18,20V12L14,16L12,14L6,20M8,9A2,2 0 0,0 6,11A2,2 0 0,0 8,13A2,2 0 0,0 10,11A2,2 0 0,0 8,9Z" />
                </svg>
            )
        }
    }

    return (
        <div className="space-y-4">
            {/* Template Card Compacto */}
            <Card className="">
                {/* Header com gradiente */}
                {/* <div className={`bg-gradient-to-r ${getPreviewGradient()} px-6 py-4`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                    {getPreviewIcon()}
                                </div>
                                <div className="text-white">
                                    <h3 className="font-semibold text-lg leading-tight mb-1">
                                        Template Ativo
                                    </h3>
                                    <p className="text-sm opacity-90">
                                        {template.variables.length} {template.variables.length === 1 ? 'variável identificada' : 'variáveis identificadas'}
                                    </p>
                                </div>
                            </div>
                            <Badge
                                variant="secondary"
                                className="bg-white/90 text-gray-900 hover:bg-white border-0"
                            >
                                {template.fileExtension === 'GOOGLE_DOCS'
                                    ? 'Google Docs'
                                    : template.fileExtension === 'GOOGLE_SLIDES'
                                      ? 'Google Slides'
                                      : template.fileExtension}
                            </Badge>
                        </div>
                    </div> */}

                {/* Content */}
                <CardContent className="flex flex-row p-0 gap-10">
                    <div className="w-[35rem] h-[15rem] bg-muted"></div>

                    <div className="flex flex-col w-full">
                        <div className="flex flex-wrap gap-2 self-end">
                            {template.inputMethod !== 'UPLOAD' && (
                                <Button
                                    variant="outline"
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
                                    />
                                    {isRefreshing
                                        ? 'Atualizando...'
                                        : 'Atualizar'}
                                </Button>
                            )}
                            <Button variant="outline" onClick={handleEdit}>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Editar
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleRemoveTemplate}
                                disabled={isDeleting}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {isDeleting ? 'Removendo...' : 'Remover'}
                            </Button>
                        </div>

                        <div className="flex flex-col gap-4 mt-1">
                            {/* File Info */}
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <svg
                                        className="w-5 h-5 text-muted-foreground"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                        <polyline points="13 2 13 9 20 9" />
                                    </svg>
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

                            {/* Source */}
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <svg
                                        className="w-5 h-5 text-muted-foreground"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 16v-4M12 8h.01" />
                                    </svg>
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
                                        {template.inputMethod === 'UPLOAD' ? (
                                            <Button
                                                variant="default"
                                                onClick={handleViewFile}
                                                size="sm"
                                            >
                                                <svg
                                                    className="h-4 w-4 mr-2"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                                                </svg>
                                                Baixar
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={handleViewFile}
                                            >
                                                <svg
                                                    className="h-4 w-4 mr-2"
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
                                    <svg
                                        className="w-5 h-5 text-muted-foreground"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 16v-4M12 8h.01" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-muted-foreground mb-1">
                                        Variáveis do Template
                                    </p>
                                    <div className="mt-3">
                                        {template.variables.map(
                                            (variable, index) => (
                                                <Badge
                                                    key={index}
                                                    className="font-mono mr-2 bg-accent text-accent-foreground"
                                                >
                                                    {`{{ ${variable} }}`}
                                                </Badge>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Info box - mais discreto */}
            {template.variables.length > 0 && (
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
            )}
        </div>
    )
}
