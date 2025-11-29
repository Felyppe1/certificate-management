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
    googleOAuthToken: string | null
    googleOAuthTokenExpiry: Date | null
    emailSent: boolean
    certificatesGenerated: boolean
}

export function TemplateSection({
    certificateId,
    template,
    googleOAuthToken,
    googleOAuthTokenExpiry,
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
    // const [signedUrlState, signedUrlAction, signedUrlIsLoading] =
    //     useActionState(createWriteBucketSignedUrlAction, null)
    const [uploadState, uploadAction, uploadIsLoading] = useActionState(
        addTemplateByUploadAction,
        null,
    )
    // const [uploadState, uploadAction, uploadIsLoading] = useActionState(
    //     create
    //     null,
    // )

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
            toast.success(driverPickerState.message)
        } else {
            toast.error(driverPickerState.message)
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
                <CardHeader className="flex justify-between">
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
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                        Cancelar
                    </Button>
                </CardHeader>
                <CardContent className="">
                    <FileSelector
                        googleOAuthToken={googleOAuthToken}
                        googleOAuthTokenExpiry={googleOAuthTokenExpiry}
                        onSubmitUrl={handleSubmitUrl}
                        onSubmitDrive={handleSubmitDrive}
                        onSubmitUpload={handleSubmitUpload}
                        isDriveLoading={drivePickerIsLoading}
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
                    googleOAuthToken={googleOAuthToken}
                    googleOAuthTokenExpiry={googleOAuthTokenExpiry}
                    onSubmitUrl={handleSubmitUrl}
                    onSubmitDrive={handleSubmitDrive}
                    onSubmitUpload={handleSubmitUpload}
                    isDriveLoading={drivePickerIsLoading}
                    isUploadLoading={uploadIsLoading}
                    isUrlLoading={urlIsLoading}
                    radioGroupName={radioGroupName}
                    type="template"
                />
            </CardContent>
        </Card>
    )
}
