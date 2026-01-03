'use client'

import { FileSelector, SelectOption } from '@/components/FileSelector'
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
import { addDataSourceByDrivePickerAction } from '@/backend/infrastructure/server-actions/add-data-source-by-drive-picker-action'
import { addDataSourceByUploadAction } from '@/backend/infrastructure/server-actions/add-data-source-by-upload-action'
import { Badge } from '@/components/ui/badge'
import { AiIcon3 } from '@/components/svg/AiIcon3'
import { GENERATION_STATUS } from '@/backend/domain/data-set'
import { toast } from 'sonner'
import { useGoogleRelogin } from '@/components/useGoogleRelogin'
import { useDataSourceUrlForm } from './useDataSourceUrlForm'

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

    const {
        form: urlForm,
        onSubmit: handleUrlSubmit,
        isSubmitting: urlIsLoading,
        errors: urlErrors,
    } = useDataSourceUrlForm({
        certificateId,
        onSuccess: () => setIsEditing(false),
    })

    const resetUrlForm = (value: SelectOption) => {
        if (value !== 'link') {
            urlForm.reset()
        }
    }

    const [driverPickerState, drivePickerAction, drivePickerIsLoading] =
        useActionState(addDataSourceByDrivePickerAction, null)
    const [uploadState, uploadAction, uploadIsLoading] = useActionState(
        addDataSourceByUploadAction,
        null,
    )

    const handleSubmitUrl = async (formData: FormData) => {
        const fileUrl = formData.get('fileUrl') as string
        urlForm.setValue('fileUrl', fileUrl)
        await handleUrlSubmit()
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
        if (driverPickerState?.success || uploadState?.success) {
            setIsEditing(false)
        }
    }, [driverPickerState, uploadState])

    useEffect(() => {
        if (!driverPickerState) return

        if (driverPickerState.success) {
            toast.success('Fonte de dados adicionada com sucesso')
        } else {
            if (driverPickerState.errorType === 'google-token-refresh-failed') {
                toast.error(
                    'Sessão do Google expirada. Entre novamente com a sua conta.',
                )
                login()
            } else if (
                driverPickerState.errorType ===
                'unsupported-data-source-mimetype'
            ) {
                toast.error(
                    'Tipo de arquivo não suportado. Apenas Google Planilhas, .csv ou .xlsx são permitidos',
                )
            } else {
                toast.error(
                    'Ocorreu um erro ao tentar adicionar fonte de dados',
                )
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
                        onSelectedOptionChanged={resetUrlForm}
                        isDriveLoading={drivePickerIsLoading || loginIsLoading}
                        isUploadLoading={uploadIsLoading}
                        isUrlLoading={urlIsLoading}
                        urlInputError={urlErrors.fileUrl?.message}
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
                    onSelectedOptionChanged={resetUrlForm}
                    isDriveLoading={drivePickerIsLoading || loginIsLoading}
                    isUploadLoading={uploadIsLoading}
                    isUrlLoading={urlIsLoading}
                    urlInputError={urlErrors.fileUrl?.message}
                    radioGroupName={radioGroupName}
                    type="data-source"
                />
            </CardContent>
        </Card>
    )
}
