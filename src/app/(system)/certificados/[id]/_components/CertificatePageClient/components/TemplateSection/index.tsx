'use client'

import { FileSelector, SelectOption } from '@/components/FileSelector'
import { startTransition, useState, useEffect } from 'react'
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
import { TEMPLATE_FILE_MIME_TYPE } from '@/backend/domain/template'
import { addTemplateByUploadAction } from '@/backend/infrastructure/server-actions/add-template-by-upload-action'
import { toast } from 'sonner'
import { useGoogleRelogin } from '@/components/useGoogleRelogin'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addTemplateByUrlAction } from '@/backend/infrastructure/server-actions/add-template-by-url-action'
import z from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

interface TemplateSectionProps {
    certificateId: string
    template: {
        driveFileId: string | null
        storageFileUrl: string | null
        inputMethod: INPUT_METHOD
        fileName: string
        fileMimeType: TEMPLATE_FILE_MIME_TYPE
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
    const queryClient = useQueryClient()

    const templateUrlFormSchema = z.object({
        fileUrl: z.url('URL inválida'),
    })

    type TemplateUrlForm = z.infer<typeof templateUrlFormSchema>

    const templateUrlForm = useForm<TemplateUrlForm>({
        resolver: zodResolver(templateUrlFormSchema),
        defaultValues: { fileUrl: '' },
    })

    const urlMutation = useMutation({
        mutationFn: async (data: TemplateUrlForm) => {
            const formData = new FormData()
            formData.append('certificateId', certificateId)
            formData.append('fileUrl', data.fileUrl)
            const result = await addTemplateByUrlAction(null, formData)
            if (!result?.success) throw result
            return result
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.certificateEmission(certificateId),
            })
            toast.success('Template adicionado com sucesso')
            templateUrlForm.reset()
            setIsEditing(false)
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return

            if (error?.errorType === 'drive-file-not-found') {
                toast.error(
                    'Arquivo não encontrado. Verifique se ele se existe no Drive, se você tem permissão para acessá-lo ou se ele está público',
                )
            } else if (error?.errorType === 'unsupported-template-mimetype') {
                toast.error(
                    'Tipo de arquivo não suportado. Apenas Google Slides, Google Docs, .pptx ou .docx são permitidos',
                )
            } else if (
                error?.errorType === 'template-variables-parsing-error'
            ) {
                toast.error(
                    'Foi encontrado um erro de sintaxe do Liquid no template.',
                )
            } else if (error?.errorType === 'template-file-size-too-large') {
                toast.error(
                    `O arquivo do template é muito grande. O tamanho máximo é 5MB`,
                )
            } else {
                toast.error('Ocorreu um erro ao tentar adicionar template')
            }
        },
    })

    const drivePickerMutation = useMutation({
        mutationFn: async (fileId: string) => {
            const formData = new FormData()
            formData.append('fileId', fileId)
            formData.append('certificateId', certificateId)
            const result = await addTemplateByDrivePickerAction(null, formData)
            if (!result?.success) throw result
            return result
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.certificateEmission(certificateId),
            })
            toast.success('Template adicionado com sucesso')
            setIsEditing(false)
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return

            if (error?.errorType === 'google-token-refresh-failed') {
                toast.error(
                    'Sessão do Google expirada. Entre novamente com a sua conta.',
                )
                login()
            } else if (error?.errorType === 'unsupported-template-mimetype') {
                toast.error(
                    'Tipo de arquivo não suportado. Apenas Google Slides, Google Docs, .pptx ou .docx são permitidos',
                )
            } else if (
                error?.errorType === 'template-variables-parsing-error'
            ) {
                toast.error(
                    'Foi encontrado um erro de sintaxe do Liquid no template.',
                )
            } else if (error?.errorType === 'template-file-size-too-large') {
                toast.error(
                    `O arquivo do template é muito grande. O tamanho máximo é 5MB`,
                )
            } else {
                toast.error('Ocorreu um erro ao tentar adicionar template')
            }
        },
    })

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData()
            formData.append('certificateId', certificateId)
            formData.append('file', file)
            const result = await addTemplateByUploadAction(null, formData)
            if (!result?.success) throw result
            return result
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.certificateEmission(certificateId),
            })
            toast.success('Template adicionado com sucesso')
            setIsEditing(false)
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return

            if (error?.errorType === 'unsupported-template-mimetype') {
                toast.error(
                    'Tipo de arquivo não suportado. Apenas .pptx ou .docx são permitidos',
                )
            } else if (
                error?.errorType === 'template-variables-parsing-error'
            ) {
                toast.error(
                    'Foi encontrado um erro de sintaxe do Liquid no template.',
                )
            } else {
                toast.error('Ocorreu um erro ao fazer upload do template')
            }
        },
    })

    const handleEdit = () => setIsEditing(true)
    const handleCancelEdit = () => setIsEditing(false)

    const { login, isLoading: loginIsLoading } = useGoogleRelogin({ userEmail })

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
                        disabled={
                            urlMutation.isPending ||
                            drivePickerMutation.isPending
                        }
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 self-end xs:self-auto"
                    >
                        Cancelar
                    </Button>
                </CardHeader>
                <CardContent className="">
                    <FileSelector
                        userEmail={userEmail}
                        googleOAuthToken={googleOAuthToken}
                        urlForm={templateUrlForm}
                        onSubmitUrl={data => urlMutation.mutate(data)}
                        onSubmitDrive={fileId =>
                            drivePickerMutation.mutate(fileId)
                        }
                        onSubmitUpload={file => uploadMutation.mutate(file)}
                        isDriveLoading={
                            drivePickerMutation.isPending || loginIsLoading
                        }
                        isUploadLoading={uploadMutation.isPending}
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
                userEmail={userEmail}
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
                    urlForm={templateUrlForm}
                    onSubmitUrl={data => urlMutation.mutate(data)}
                    onSubmitDrive={fileId => drivePickerMutation.mutate(fileId)}
                    onSubmitUpload={file => uploadMutation.mutate(file)}
                    isDriveLoading={
                        drivePickerMutation.isPending || loginIsLoading
                    }
                    isUploadLoading={uploadMutation.isPending}
                    radioGroupName={radioGroupName}
                    type="template"
                />
            </CardContent>
        </Card>
    )
}
