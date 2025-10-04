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
import { RefreshCw, Edit3, Trash2, User } from 'lucide-react'
import { useState, startTransition, useActionState, useEffect } from 'react'
import { FileSelector } from '@/components/FileSelector'
import { addTemplateByUrlAction } from '@/server-actions/add-template-by-url-action'
import { refreshTemplateByUrlAction } from '@/server-actions/refresh-template-by-url-action'
import { deleteTemplateAction } from '@/server-actions/delete-template-action'
import { addTemplateByDrivePickerAction } from '@/server-actions/add-template-by-drive-picker-action'

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
}

function getFileExtensionColor(extension: string) {
    switch (extension) {
        case 'DOCX':
            return 'bg-blue-100 text-blue-800'
        case 'GOOGLE_DOCS':
            return 'bg-blue-100 text-blue-800'
        case 'PPTX':
            return 'bg-orange-100 text-orange-800'
        case 'GOOGLE_SLIDES':
            return 'bg-orange-100 text-orange-800'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}

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

export function TemplateDisplay({
    template,
    certificateId,
    googleOAuthToken,
}: TemplateDisplayProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [, refreshAction, isRefreshing] = useActionState(
        refreshTemplateByUrlAction,
        null,
    )
    const [urlState, addAction, isAddingNew] = useActionState(
        addTemplateByUrlAction,
        null,
    )
    const [, deleteAction, isDeleting] = useActionState(
        deleteTemplateAction,
        null,
    )
    const [drivePickerState, drivePickerAction, drivePickerIsLoading] =
        useActionState(addTemplateByDrivePickerAction, null)

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

    const handleSubmitNewTemplate = async (formData: FormData) => {
        formData.append('certificateId', certificateId)

        startTransition(() => {
            addAction(formData)
        })
    }

    const handleSubmitDrive = async (fileId: string) => {
        const formData = new FormData()
        formData.append('fileId', fileId)
        formData.append('certificateId', certificateId)

        startTransition(() => {
            drivePickerAction(formData)
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

    if (urlState) {
        console.log(urlState.message)
    }

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
                                    isAddingNew ||
                                    isDeleting ||
                                    drivePickerIsLoading
                                }
                            >
                                Cancelar
                            </Button>
                        </div>
                        <FileSelector
                            googleOAuthToken={googleOAuthToken}
                            onSubmitDrive={handleSubmitDrive}
                            onSubmitUrl={handleSubmitNewTemplate}
                            isLoading={
                                isRefreshing ||
                                isAddingNew ||
                                isDeleting ||
                                drivePickerIsLoading
                            }
                        />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Template do Certificado */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {/* <FileText className="h-5 w-5" /> */}
                            <CardTitle>Template do Certificado</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            {template.inputMethod === 'URL' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                                    />
                                    {isRefreshing
                                        ? 'Atualizando...'
                                        : 'Atualizar'}
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleEdit}
                            >
                                <Edit3 className="h-4 w-4" />
                                Editar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRemoveTemplate}
                                disabled={isDeleting}
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                                {isDeleting ? 'Removendo...' : 'Remover'}
                            </Button>
                        </div>
                    </div>
                    <CardDescription>
                        Template selecionado para gerar os certificados
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Informações do Template */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-green-800">
                                Template Ativo
                            </h3>
                            <div className="flex gap-2">
                                <Badge
                                    variant="secondary"
                                    className={getFileExtensionColor(
                                        template.fileExtension,
                                    )}
                                >
                                    {template.fileExtension === 'GOOGLE_DOCS'
                                        ? 'Google Docs'
                                        : template.fileExtension ===
                                            'GOOGLE_SLIDES'
                                          ? 'Google Slides'
                                          : template.fileExtension}
                                </Badge>
                                <Badge variant="outline">
                                    {getInputMethodLabel(template.inputMethod)}
                                </Badge>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">
                            <strong>Nome do arquivo:</strong>{' '}
                            {template.fileName}
                        </p>
                    </div>

                    {/* Variáveis do Template */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            {/* <User className="h-5 w-5" /> */}
                            <h3 className="font-medium text-gray-900">
                                Variáveis do Template
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Variáveis identificadas no template que serão
                            substituídas na geração dos certificados
                        </p>

                        {template.variables.length > 0 ? (
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {template.variables.map(
                                        (variable, index) => (
                                            <Badge
                                                key={index}
                                                variant="outline"
                                                className="font-mono"
                                            >
                                                {`{{${variable}}}`}
                                            </Badge>
                                        ),
                                    )}
                                </div>
                                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                                    <p className="font-medium text-blue-900 mb-1">
                                        Como usar:
                                    </p>
                                    <p>
                                        Essas variáveis serão substituídas pelos
                                        dados reais durante a geração dos
                                        certificados. Por exemplo,{' '}
                                        <code className="bg-blue-100 px-1 rounded">{`{{nome}}`}</code>{' '}
                                        será substituído pelo nome da pessoa.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500">
                                <User className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                <p>Nenhuma variável encontrada no template</p>
                                <p className="text-sm mt-1">
                                    Variáveis devem estar no formato{' '}
                                    <code className="bg-gray-100 px-1 rounded">{`{{variavel}}`}</code>
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
