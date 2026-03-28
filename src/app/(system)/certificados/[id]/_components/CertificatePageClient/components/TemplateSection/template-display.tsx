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
import { useState } from 'react'
import { refreshTemplateAction } from '@/backend/infrastructure/server-actions/refresh-template-action'
import { deleteTemplateAction } from '@/backend/infrastructure/server-actions/delete-template-action'
import { downloadTemplateAction } from '@/backend/infrastructure/server-actions/download-template-action'
import { INPUT_METHOD } from '@/backend/domain/certificate'
import { TEMPLATE_FILE_MIME_TYPE } from '@/backend/domain/template'
import { SourceIcon } from '@/components/svg/SourceIcon'
import { WarningPopover } from '../../../../../../../../components/WarningPopover'
import { toast } from 'sonner'
import { useGoogleRelogin } from '@/components/useGoogleRelogin'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { queryKeys } from '@/lib/query-keys'

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
        fileMimeType: TEMPLATE_FILE_MIME_TYPE
        variables: string[]
        thumbnailUrl: string | null
    }
    certificateId: string
    onEdit: () => void
    isDisabled: boolean
    certificatesGenerated: boolean
    userEmail: string
}

export function TemplateDisplay({
    template,
    certificateId,
    onEdit,
    isDisabled,
    certificatesGenerated,
    userEmail,
}: TemplateDisplayProps) {
    const [showRefreshWarning, setShowRefreshWarning] = useState(false)
    const [showEditWarning, setShowEditWarning] = useState(false)

    const queryClient = useQueryClient()

    const { mutate: refreshAction, isPending: isRefreshing } = useMutation({
        mutationFn: async () => {
            const formData = new FormData()
            formData.append('certificateId', certificateId)
            const result = await refreshTemplateAction(null, formData)
            if (result?.success === false) {
                throw result
            }
            return result
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.certificateEmission(certificateId),
            })
            toast.success('Template atualizado com sucesso')
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return

            if (error?.errorType === 'drive-file-not-found') {
                toast.error(
                    'Arquivo não encontrado. Verifique se ele se existe no Drive, se você tem permissão para acessá-lo ou se ele está público',
                )
            } else if (error?.errorType === 'google-session-expired') {
                toast.error(
                    'Sessão do Google expirada. Entre novamente com a sua conta.',
                )
                login()
            } else {
                toast.error('Ocorreu um erro ao tentar atualizar o template')
            }
        },
    })

    const { mutate: deleteAction, isPending: isDeleting } = useMutation({
        mutationFn: async () => {
            const formData = new FormData()
            formData.append('certificateId', certificateId)
            const result = await deleteTemplateAction(null, formData)
            if (result?.success === false) {
                throw result
            }
            return result
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.certificateEmission(certificateId),
            })
            toast.success('Template removido com sucesso')
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return

            toast.error('Ocorreu um erro ao deletar o template')
        },
    })

    const {
        mutate: downloadTemplateActionHandler,
        isPending: isDownloadingTemplate,
    } = useMutation({
        mutationFn: async () => {
            const formData = new FormData()
            formData.append('certificateEmissionId', certificateId)
            const result = await downloadTemplateAction(null, formData)
            if (result?.success === false) {
                throw result
            }
            return result
        },
        onSuccess: result => {
            const signedUrl = result.data!
            window.open(signedUrl, '_blank', 'noopener,noreferrer')
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return

            toast.error('Ocorreu um erro ao tentar baixar o template')
        },
    })

    const { login, isLoading: loginIsLoading } = useGoogleRelogin({
        userEmail,
        onFinished: () => {
            toast.success(
                'Reautenticação bem-sucedida. Por favor, tente atualizar o template novamente.',
            )
        },
    })

    const handleRefresh = () => {
        refreshAction()
    }

    const handleRemoveTemplate = () => {
        deleteAction()
    }

    const handleDownloadTemplate = () => {
        downloadTemplateActionHandler()
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
                                <WarningPopover
                                    open={showRefreshWarning}
                                    onOpenChange={setShowRefreshWarning}
                                    onConfirm={handleRefresh}
                                    title="Atualizar template?"
                                    description="Você precisará gerar os certificados novamente após esta ação."
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
                                title="Editar template?"
                                description="Você precisará gerar os certificados novamente após esta ação."
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
                                onClick={handleRemoveTemplate}
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
