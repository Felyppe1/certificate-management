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
import { addTemplateByUploadAction } from '@/backend/infrastructure/server-actions/add-template-by-upload-action'
import {
    DATA_SOURCE_FILE_EXTENSION,
    INPUT_METHOD,
} from '@/backend/domain/data-source'
import { addDataSourceByUrlAction } from '@/backend/infrastructure/server-actions/add-data-source-by-url-action'
import { addDataSourceByDrivePickerAction } from '@/backend/infrastructure/server-actions/add-data-source-by-drive-picker-action'
import { addDataSourceByUploadAction } from '@/backend/infrastructure/server-actions/add-data-source-by-upload-action'

interface DataSourceSectionProps {
    certificateId: string
    dataSource: {
        id: string
        driveFileId: string | null
        storageFileUrl: string | null
        inputMethod: INPUT_METHOD
        fileName: string
        fileExtension: DATA_SOURCE_FILE_EXTENSION
        columns: string[]
        thumbnailUrl: string | null
    } | null
    googleOAuthToken: string | null
    googleOAuthTokenExpiry: Date | null
}

export function DataSourceSection({
    certificateId,
    dataSource,
    googleOAuthToken,
    googleOAuthTokenExpiry,
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

    const radioGroupName = 'data-source'

    if (dataSource && isEditing) {
        return (
            <Card>
                <CardHeader className="flex justify-between">
                    <div>
                        <CardTitle>Selecione Nova Base de Dados</CardTitle>
                        <CardDescription>
                            Selecione uma base de dados para substituir a atual
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
                    />
                </CardContent>
            </Card>
        )
    }

    // if (dataSource) {
    //     return (
    //         <TemplateDisplay
    //             dataSource={dataSource}
    //             certificateId={certificateId}
    //             onEdit={handleEdit}
    //         />
    //     )
    // }

    return (
        <Card>
            <CardHeader className="">
                <CardTitle>Base de Dados</CardTitle>
                <CardDescription>
                    Selecione a base de dados das pessoas que receberão o
                    certificado
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
                />
            </CardContent>
        </Card>
    )
}
