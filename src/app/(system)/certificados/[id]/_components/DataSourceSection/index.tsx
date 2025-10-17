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

    if (dataSource) {
        return (
            <DataSourceDisplay
                dataSource={dataSource}
                certificateId={certificateId}
                onEdit={handleEdit}
                data={[
                    {
                        Nome: 'João Silva',
                        'E-mail': 'joao@example.com',
                        Idade: '10',
                    },
                    {
                        Nome: 'Maria Santos',
                        'E-mail': 'maria@example.com',
                        Idade: '10',
                    },
                    {
                        Nome: 'Pedro Costa',
                        'E-mail': 'pedro@example.com',
                        Idade: '10',
                    },
                ]}
            />
        )
    }

    return (
        <Card>
            <CardHeader className="">
                <CardTitle>Base de Dados</CardTitle>
                <CardDescription>
                    Selecione a base de dados das pessoas que receberão o
                    certificado (CSV, XLSX, Google Planilhas, PNG, JPEG)
                </CardDescription>
            </CardHeader>
            <CardContent className="">
                <div className="space-y-4">
                    {/* AI Info for image uploads */}
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
                                <svg
                                    className="w-5 h-5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                                </svg>
                            </div>
                            <div className="text-sm">
                                <p className="font-medium text-blue-900 dark:text-blue-100">
                                    🤖 Extração Inteligente com IA
                                </p>
                                <p className="text-blue-700 dark:text-blue-300 mt-1">
                                    Ao fazer upload de imagens (PNG, JPEG),
                                    nossa IA consegue extrair automaticamente os
                                    dados dos participantes a partir de fotos de
                                    listas!
                                </p>
                            </div>
                        </div>
                    </div>

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
                </div>
            </CardContent>
        </Card>
    )
}
