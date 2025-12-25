'use client'

import { FileSelector } from '@/components/FileSelector'
import { startTransition, useActionState, useState, useEffect } from 'react'
import { DataSourceDisplay } from './data-source-display'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { INPUT_METHOD } from '@/backend/domain/certificate'
import { DATA_SOURCE_FILE_EXTENSION } from '@/backend/domain/data-source'
import { addDataSourceByUrlAction } from '@/backend/infrastructure/server-actions/add-data-source-by-url-action'
import { addDataSourceByDrivePickerAction } from '@/backend/infrastructure/server-actions/add-data-source-by-drive-picker-action'
import { addDataSourceByUploadAction } from '@/backend/infrastructure/server-actions/add-data-source-by-upload-action'
import { Badge } from '@/components/ui/badge'
import { AiIcon3 } from '@/components/svg/AiIcon3'
import { GENERATION_STATUS } from '@/backend/domain/data-set'
import { toast } from 'sonner'

interface DataSourceSectionProps {
    certificateId: string
    dataSource: {
        driveFileId: string | null
        storageFileUrl: string | null
        inputMethod: INPUT_METHOD
        fileName: string
        fileExtension: DATA_SOURCE_FILE_EXTENSION
        columns: string[]
        thumbnailUrl: string | null
        dataSet: {
            id: string
            rows: Record<string, any>[]
            totalBytes: number
            generationStatus: GENERATION_STATUS | null
        }
    } | null
    userEmail: string
    googleOAuthToken: string | null
    googleOAuthTokenExpiry: Date | null
    emailSent: boolean
}

export function DataSourceSection({
    certificateId,
    dataSource,
    userEmail,
    googleOAuthToken,
    emailSent,
}: DataSourceSectionProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [urlState, urlAction, urlIsLoading] = useActionState(
        addDataSourceByUrlAction,
        null,
    )
    const [driverPickerState, drivePickerAction, drivePickerIsLoading] =
        useActionState(addDataSourceByDrivePickerAction, null)
    const [uploadState, uploadAction, uploadIsLoading] = useActionState(
        addDataSourceByUploadAction,
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

    const radioGroupName = 'data-source'

    if (dataSource && isEditing) {
        return (
            <Card id="data-source-section">
                <CardHeader className="flex flex-col xs:flex-row justify-between gap-4">
                    <div>
                        <CardTitle>Selecione Nova Fonte de Dados</CardTitle>
                        <CardDescription>
                            Selecione uma fonte de dados para substituir a atual
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
                    <Badge
                        variant="purple"
                        size="md"
                        className="[&>svg]:size-6 pr-3 mb-4"
                    >
                        <AiIcon3 />
                        IA habilitada para imagens
                    </Badge>
                    <FileSelector
                        userEmail={userEmail}
                        googleOAuthToken={googleOAuthToken}
                        onSubmitUrl={handleSubmitUrl}
                        onSubmitDrive={handleSubmitDrive}
                        onSubmitUpload={handleSubmitUpload}
                        isDriveLoading={drivePickerIsLoading}
                        isUploadLoading={uploadIsLoading}
                        isUrlLoading={urlIsLoading}
                        radioGroupName={radioGroupName}
                        type="data-source"
                    />
                </CardContent>
            </Card>
        )
    }

    if (dataSource) {
        return (
            <DataSourceDisplay
                dataSource={dataSource}
                certificateId={certificateId}
                onEdit={handleEdit}
                isDisabled={emailSent}
            />
        )
    }

    return (
        <Card id="data-source-section">
            <CardHeader className="">
                <CardTitle>Fonte de Dados</CardTitle>
                <CardDescription>
                    Selecione a fonte de dados das pessoas que receberão o
                    certificado
                </CardDescription>
            </CardHeader>
            <CardContent className="">
                <Badge
                    variant="purple"
                    size="md"
                    className="[&>svg]:size-6 pr-3 mb-4"
                >
                    <AiIcon3 />
                    IA habilitada para imagens
                </Badge>
                <FileSelector
                    userEmail={userEmail}
                    googleOAuthToken={googleOAuthToken}
                    onSubmitUrl={handleSubmitUrl}
                    onSubmitDrive={handleSubmitDrive}
                    onSubmitUpload={handleSubmitUpload}
                    isDriveLoading={drivePickerIsLoading}
                    isUploadLoading={uploadIsLoading}
                    isUrlLoading={urlIsLoading}
                    radioGroupName={radioGroupName}
                    type="data-source"
                />
            </CardContent>
        </Card>
    )
}
