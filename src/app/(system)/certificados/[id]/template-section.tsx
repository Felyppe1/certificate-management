'use client'

import { FileSelector } from '@/components/FileSelector'
import { addTemplateByUrlAction } from '@/backend/infrastructure/server-actions/add-template-by-url-action'
import { startTransition, useActionState, useState, useEffect } from 'react'
import { TemplateDisplay } from './template-display'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { addTemplateByDrivePickerAction } from '@/backend/infrastructure/server-actions/add-template-by-drive-picker-action'
import { Button } from '@/components/ui/button'

interface TemplateSectionProps {
    certificateId: string
    template?: {
        id: string
        driveFileId: string | null
        storageFileUrl: string | null
        inputMethod: string
        fileName: string
        fileExtension: string
        variables: string[]
    }
    googleOAuthToken: string | null
    googleOAuthTokenExpiry: Date | null
}

export function TemplateSection({
    certificateId,
    template,
    googleOAuthToken,
    googleOAuthTokenExpiry,
}: TemplateSectionProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [urlState, urlAction, urlIsLoading] = useActionState(
        addTemplateByUrlAction,
        null,
    )
    const [driverPickerState, drivePickerAction, drivePickerIsLoading] =
        useActionState(addTemplateByDrivePickerAction, null)

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

    const handleEdit = () => {
        setIsEditing(true)
    }

    const handleCancelEdit = () => {
        setIsEditing(false)
    }

    useEffect(() => {
        if (urlState?.success || driverPickerState?.success) {
            setIsEditing(false)
        }
    }, [urlState, driverPickerState])

    if (template && isEditing) {
        return (
            <Card>
                <div className="flex justify-between p-6">
                    <div>
                        <CardTitle>Selecionar Novo Template</CardTitle>
                        <CardDescription>
                            Escolha um novo template para substituir o atual
                        </CardDescription>
                    </div>

                    <Button
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={urlIsLoading || drivePickerIsLoading}
                    >
                        Cancelar
                    </Button>
                </div>
                <div className="px-6 pb-6">
                    <FileSelector
                        googleOAuthToken={googleOAuthToken}
                        googleOAuthTokenExpiry={googleOAuthTokenExpiry}
                        onSubmitUrl={handleSubmitUrl}
                        onSubmitDrive={handleSubmitDrive}
                        isDriveLoading={drivePickerIsLoading}
                        isUploadLoading={false}
                        isUrlLoading={urlIsLoading}
                    />
                </div>
            </Card>
        )
    }

    if (template) {
        return (
            <TemplateDisplay
                template={template}
                certificateId={certificateId}
                onEdit={handleEdit}
            />
        )
    }

    return (
        <Card>
            <div className="p-6">
                <CardTitle>Template do Certificado</CardTitle>
                <CardDescription>
                    Selecione um template para gerar os certificados
                </CardDescription>
            </div>
            <div className="px-6 pb-6">
                <FileSelector
                    googleOAuthToken={googleOAuthToken}
                    googleOAuthTokenExpiry={googleOAuthTokenExpiry}
                    onSubmitUrl={handleSubmitUrl}
                    onSubmitDrive={handleSubmitDrive}
                    isDriveLoading={drivePickerIsLoading}
                    isUploadLoading={false}
                    isUrlLoading={urlIsLoading}
                />
            </div>
        </Card>
    )
}
