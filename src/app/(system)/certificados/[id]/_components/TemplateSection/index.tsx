'use client'

import { FileSelector } from '@/components/FileSelector'
import { addTemplateByUrlAction } from '@/backend/infrastructure/server-actions/add-template-by-url-action'
import { startTransition, useActionState, useState, useEffect } from 'react'
import { TemplateDisplay } from './template-display'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { addTemplateByDrivePickerAction } from '@/backend/infrastructure/server-actions/add-template-by-drive-picker-action'
import { Button } from '@/components/ui/button'
import { INPUT_METHOD } from '@/backend/domain/certificate'
import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'
import { addTemplateByUploadAction } from '@/backend/infrastructure/server-actions/add-template-by-upload-action'
import { toast } from 'sonner'
import { useGoogleRelogin } from '@/components/useGoogleRelogin'

interface TemplateSectionProps {
    certificateId: string
    template: {
        driveFileId: string | null
        storageFileUrl: string | null
        inputMethod: INPUT_METHOD
        fileName: string
        fileExtension: TEMPLATE_FILE_EXTENSION
        variables: string[]
        thumbnailUrl: string | null
    } | null
    userEmail: string
    googleOAuthToken: string | null
    googleOAuthTokenExpiry: Date | null
    emailSent: boolean
    certificatesGenerated: boolean
}

export function TemplateSection({
    certificateId,
    template,
    userEmail,
    googleOAuthToken,
    emailSent,
    certificatesGenerated,
}: TemplateSectionProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [urlState, urlAction, urlIsLoading] = useActionState(
        addTemplateByUrlAction,
        null,
    )
    const [driverPickerState, drivePickerAction, drivePickerIsLoading] =
        useActionState(addTemplateByDrivePickerAction, null)
    const [uploadState, uploadAction, uploadIsLoading] = useActionState(
        addTemplateByUploadAction,
        null,
    )

    const handleSubmitUrl = async (formData: FormData) => {
        formData.append('certificateId', certificateId)

        startTransition(() => {
            urlAction(formData)
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

    const handleSubmitUpload = async (file: File) => {
        const formData = new FormData()

        formData.append('certificateId', certificateId)
        formData.append('file', file)

        startTransition(() => {
            uploadAction(formData)
        })
    }

    const handleEdit = () => {
        setIsEditing(true)
    }

    const handleCancelEdit = () => {
        setIsEditing(false)
    }

    const { login, isLoading: loginIsLoading } = useGoogleRelogin({ userEmail })

    useEffect(() => {
        if (
            urlState?.success ||
            driverPickerState?.success ||
            uploadState?.success
        ) {
            setIsEditing(false)
        }
    }, [urlState, driverPickerState, uploadState])

    useEffect(() => {
        if (!urlState) return

        if (urlState.success) {
            toast.success(urlState.message)
        } else {
            toast.error(urlState?.message)
        }
    }, [urlState])

    useEffect(() => {
        if (!driverPickerState) return

        if (driverPickerState.success) {
            toast.success('Template adicionado com sucesso')
        } else {
            if (driverPickerState.errorType === 'google-token-refresh-failed') {
                toast.error(
                    'Sessão do Google expirada. Entre novamente com a sua conta.',
                )
                login()
            } else if (
                driverPickerState.errorType === 'unsupported-template-mimetype'
            ) {
                toast.error(
                    'Tipo de arquivo não suportado. Apenas Google Slides, Google Docs, .pptx ou .docx são permitidos',
                )
            } else if (
                driverPickerState.errorType ===
                'template-variables-parsing-error'
            ) {
                toast.error(
                    'Foi encontrado um erro de sintaxe do Liquid no template.',
                )
            } else {
                toast.error('Ocorreu um erro ao tentar adicionar template')
            }
        }
    }, [driverPickerState])

    useEffect(() => {
        if (!uploadState) return

        if (uploadState.success) {
            toast.success(uploadState.message)
        } else {
            toast.error(uploadState.message)
        }
    }, [uploadState])

    const radioGroupName = 'template'

    if (template && isEditing) {
        return (
            <Card>
                <CardHeader className="flex flex-col xs:flex-row justify-between gap-4">
                    <div>
                        <CardTitle>Selecionar Novo Template</CardTitle>
                        <CardDescription>
                            Selecione um novo template para substituir o atual
                        </CardDescription>
                    </div>

                    <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={urlIsLoading || drivePickerIsLoading}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 self-end xs:self-auto"
                    >
                        Cancelar
                    </Button>
                </CardHeader>
                <CardContent className="">
                    <FileSelector
                        userEmail={userEmail}
                        googleOAuthToken={googleOAuthToken}
                        onSubmitUrl={handleSubmitUrl}
                        onSubmitDrive={handleSubmitDrive}
                        onSubmitUpload={handleSubmitUpload}
                        isDriveLoading={drivePickerIsLoading || loginIsLoading}
                        isUploadLoading={uploadIsLoading}
                        isUrlLoading={urlIsLoading}
                        radioGroupName={radioGroupName}
                        type="template"
                    />
                </CardContent>
            </Card>
        )
    }

    if (template) {
        return (
            <TemplateDisplay
                template={template}
                certificateId={certificateId}
                onEdit={handleEdit}
                isDisabled={emailSent}
                certificatesGenerated={certificatesGenerated}
            />
        )
    }

    return (
        <Card>
            <CardHeader className="">
                <CardTitle>Template do Certificado</CardTitle>
                <CardDescription>
                    Selecione um template para gerar os certificados
                </CardDescription>
            </CardHeader>
            <CardContent className="">
                <FileSelector
                    userEmail={userEmail}
                    googleOAuthToken={googleOAuthToken}
                    onSubmitUrl={handleSubmitUrl}
                    onSubmitDrive={handleSubmitDrive}
                    onSubmitUpload={handleSubmitUpload}
                    isDriveLoading={drivePickerIsLoading || loginIsLoading}
                    isUploadLoading={uploadIsLoading}
                    isUrlLoading={urlIsLoading}
                    radioGroupName={radioGroupName}
                    type="template"
                />
            </CardContent>
        </Card>
    )
}
