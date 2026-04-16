'use client'

import { FileSelector, SelectOption } from '@/components/FileSelector'
import { UrlFormValues } from '@/components/FileSelector/UrlForm'
import { useState } from 'react'
import { DataSourceDisplay } from './components/DataSourceDisplay'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { INPUT_METHOD } from '@/backend/domain/certificate'
import {
    DATA_SOURCE_MIME_TYPE,
    MAX_DATA_SOURCE_ROWS,
    MAX_DATA_SOURCE_COLUMNS,
} from '@/backend/domain/data-source'
import { addDataSourceByDrivePickerAction } from '@/backend/infrastructure/server-actions/add-data-source-by-drive-picker-action'
import { addDataSourceByUploadAction } from '@/backend/infrastructure/server-actions/add-data-source-by-upload-action'
import { Badge } from '@/components/ui/badge'
import { AiIcon3 } from '@/components/svg/AiIcon3'
import { PROCESSING_STATUS_ENUM } from '@/backend/domain/data-source-row'
import { toast } from 'sonner'
import { useGoogleRelogin } from '@/custom-hooks/useGoogleRelogin'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import z from 'zod'
import { addDataSourceByUrlAction } from '@/backend/infrastructure/server-actions/add-data-source-by-url-action'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { queryKeys } from '@/lib/query-keys'
import { ColumnType } from '@/backend/domain/data-source-column'

interface DataSourceSectionProps {
    certificateId: string
    certificatesEmitted: boolean
    dataSource: {
        files: {
            fileName: string
            driveFileId: string | null
            storageFileUrl: string | null
        }[]
        inputMethod: INPUT_METHOD
        fileMimeType: DATA_SOURCE_MIME_TYPE
        columns: {
            name: string
            type: ColumnType
            arraySeparator: string | null
        }[]
        thumbnailUrl: string | null
        rows: {
            id: string
            processingStatus: PROCESSING_STATUS_ENUM
            fileBytes: number | null
            data: Record<string, any>
        }[]
    } | null
    userEmail: string
    googleOAuthToken: string | null
    googleOAuthTokenExpiry: Date | null
    emailSent: boolean
}

export function DataSourceSection({
    certificateId,
    certificatesEmitted,
    dataSource,
    userEmail,
    googleOAuthToken,
    emailSent,
}: DataSourceSectionProps) {
    const [isEditing, setIsEditing] = useState(false)

    const queryClient = useQueryClient()

    const dataSourceUrlFormSchema = z.object({
        fileUrls: z
            .array(z.object({ value: z.url('URL inválida') }))
            .min(1)
            .max(4),
    })

    type DataSourceUrlForm = z.infer<typeof dataSourceUrlFormSchema>

    const urlForm = useForm<UrlFormValues>({
        resolver: zodResolver(dataSourceUrlFormSchema),
        defaultValues: { fileUrls: [{ value: '' }] },
    })

    const onSubmitUrl = async (data: UrlFormValues) => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)
        data.fileUrls.forEach(({ value }) => formData.append('fileUrls', value))

        const result = await addDataSourceByUrlAction(null, formData)

        if (!result?.success) {
            if (result.errorType === 'drive-file-not-found') {
                toast.error(
                    'Arquivo não encontrado. Verifique se ele se existe no Drive, se você tem permissão para acessá-lo ou se ele está público',
                )
            } else if (
                result.errorType === 'unsupported-data-source-mimetype'
            ) {
                toast.error(
                    'Tipo de arquivo não suportado. Apenas Google Planilhas, .csv ou .xlsx são permitidos',
                )
            } else if (result.errorType === 'data-source-rows-exceeded') {
                toast.error(
                    `A fonte de dados não pode ter mais de ${MAX_DATA_SOURCE_ROWS} linhas`,
                )
            } else if (result.errorType === 'data-source-columns-exceeded') {
                toast.error(
                    `A fonte de dados não pode ter mais de ${MAX_DATA_SOURCE_COLUMNS} colunas`,
                )
            } else if (result.errorType === 'data-source-file-size-too-large') {
                toast.error(
                    `O arquivo da fonte de dados é muito grande. O tamanho máximo é 2MB`,
                )
            } else if (result.errorType === 'genai-api-unavailable') {
                toast.error(
                    `O serviço de IA está enfrentando uma alta demanda. Por favor, tente novamente mais tarde`,
                )
            } else if (
                result.errorType === 'data-source-all-files-not-images'
            ) {
                toast.error(
                    'Só é possível enviar mais de um arquivo se forem imagens',
                )
            } else {
                toast.error(
                    'Ocorreu um erro ao tentar adicionar fonte de dados',
                )
            }

            return
        }

        await queryClient.invalidateQueries({
            queryKey: queryKeys.certificateEmission(certificateId),
        })
        toast.success('Fonte de dados adicionada com sucesso')
        urlForm.reset({ fileUrls: [{ value: '' }] })
        setIsEditing(false)
    }

    const { login, isLoading: loginIsLoading } = useGoogleRelogin({ userEmail })

    const drivePickerMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const result = await addDataSourceByDrivePickerAction(
                null,
                formData,
            )
            if (result?.success === false) {
                throw result
            }
            return result
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.certificateEmission(certificateId),
            })
            toast.success('Fonte de dados adicionada com sucesso')
            setIsEditing(false)
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return

            if (error?.errorType === 'google-token-refresh-failed') {
                toast.error(
                    'Sessão do Google expirada. Entre novamente com a sua conta.',
                )
                login()
            } else if (
                error?.errorType === 'unsupported-data-source-mimetype'
            ) {
                toast.error(
                    'Tipo de arquivo não suportado. Apenas Google Planilhas, .csv ou .xlsx são permitidos',
                )
            } else if (error?.errorType === 'data-source-rows-exceeded') {
                toast.error(
                    `A fonte de dados não pode ter mais de ${MAX_DATA_SOURCE_ROWS} linhas`,
                )
            } else if (error?.errorType === 'data-source-file-size-too-large') {
                toast.error(
                    `O arquivo da fonte de dados é muito grande. O tamanho máximo é 2MB`,
                )
            } else if (error?.errorType === 'data-source-columns-exceeded') {
                toast.error(
                    `A fonte de dados não pode ter mais de ${MAX_DATA_SOURCE_COLUMNS} colunas`,
                )
            } else if (error?.errorType === 'genai-api-unavailable') {
                toast.error(
                    `O serviço de IA está enfrentando uma alta demanda. Por favor, tente novamente mais tarde.`,
                )
            } else {
                toast.error(
                    'Ocorreu um erro ao tentar adicionar fonte de dados',
                )
            }
        },
    })

    const uploadMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const result = await addDataSourceByUploadAction(null, formData)
            if (result?.success === false) {
                throw result
            }
            return result
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.certificateEmission(certificateId),
            })
            toast.success('Fonte de dados adicionada com sucesso')
            setIsEditing(false)
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return

            if (error?.errorType === 'unsupported-data-source-mimetype') {
                toast.error(
                    'Tipo de arquivo não suportado. Apenas .csv ou .xlsx são permitidos',
                )
            } else if (error?.errorType === 'data-source-rows-exceeded') {
                toast.error(
                    `A fonte de dados não pode ter mais de ${MAX_DATA_SOURCE_ROWS} linhas`,
                )
            } else if (error?.errorType === 'data-source-columns-exceeded') {
                toast.error(
                    `A fonte de dados não pode ter mais de ${MAX_DATA_SOURCE_COLUMNS} colunas`,
                )
            } else if (error?.errorType === 'genai-api-unavailable') {
                toast.error(
                    `O serviço de IA está enfrentando uma alta demanda. Por favor, tente novamente mais tarde.`,
                )
            } else {
                toast.error('Ocorreu um erro ao fazer upload da fonte de dados')
            }
        },
    })

    const handleSubmitDrive = async (fileIds: string[]) => {
        const formData = new FormData()
        fileIds.forEach(fileId => formData.append('fileIds', fileId))
        formData.append('certificateId', certificateId)

        drivePickerMutation.mutate(formData)
    }

    const handleSubmitUpload = async (files: File[]) => {
        const formData = new FormData()

        formData.append('certificateId', certificateId)
        files.forEach(file => formData.append('files', file))

        uploadMutation.mutate(formData)
    }

    const handleEdit = () => {
        setIsEditing(true)
    }

    const handleCancelEdit = () => {
        setIsEditing(false)
    }

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
                        disabled={
                            urlForm.formState.isSubmitting ||
                            drivePickerMutation.isPending
                        }
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                        Cancelar
                    </Button>
                </CardHeader>
                <CardContent className="">
                    <Badge
                        variant="purple"
                        size="md"
                        className="[&>svg]:size-6 pr-3 mb-4 text-xs xs:text-sm"
                    >
                        <AiIcon3 />
                        Extração dos dados com IA para imagens
                    </Badge>
                    <FileSelector
                        userEmail={userEmail}
                        googleOAuthToken={googleOAuthToken}
                        urlForm={urlForm}
                        onSubmitUrl={onSubmitUrl}
                        onSubmitDrive={handleSubmitDrive}
                        onSubmitUpload={handleSubmitUpload}
                        isDriveLoading={
                            drivePickerMutation.isPending || loginIsLoading
                        }
                        isUploadLoading={uploadMutation.isPending}
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
                certificatesEmitted={certificatesEmitted}
                onEdit={handleEdit}
                isDisabled={emailSent}
                emailSent={emailSent}
                userEmail={userEmail}
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
                    className="[&>svg]:size-4 pr-3 mb-4 text-xs xs:text-sm"
                >
                    <AiIcon3 />
                    Extração dos dados com IA para imagens
                </Badge>
                <FileSelector
                    userEmail={userEmail}
                    googleOAuthToken={googleOAuthToken}
                    urlForm={urlForm}
                    onSubmitUrl={onSubmitUrl}
                    onSubmitDrive={handleSubmitDrive}
                    onSubmitUpload={handleSubmitUpload}
                    isDriveLoading={
                        drivePickerMutation.isPending || loginIsLoading
                    }
                    isUploadLoading={uploadMutation.isPending}
                    radioGroupName={radioGroupName}
                    type="data-source"
                />
            </CardContent>
        </Card>
    )
}
