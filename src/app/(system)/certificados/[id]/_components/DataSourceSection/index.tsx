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
    googleOAuthToken: string | null
    googleOAuthTokenExpiry: Date | null
    emailSent: boolean
}

export function DataSourceSection({
    certificateId,
    dataSource,
    googleOAuthToken,
    googleOAuthTokenExpiry,
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
                    <Badge
                        variant="purple"
                        size="md"
                        className="[&>svg]:size-6 pr-3 mb-4"
                    >
                        <AiIcon3 />
                        IA habilitada para imagens
                    </Badge>
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
        <Card>
            <CardHeader className="">
                <CardTitle>Base de Dados</CardTitle>
                <CardDescription>
                    Selecione a base de dados das pessoas que receberão o
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
                    googleOAuthToken={googleOAuthToken}
                    googleOAuthTokenExpiry={googleOAuthTokenExpiry}
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
