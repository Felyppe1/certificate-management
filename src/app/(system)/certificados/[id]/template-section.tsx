'use client'

import { FileSelector } from '@/components/FileSelector'
import { addTemplateByUrlAction } from '@/backend/infrastructure/server-actions/add-template-by-url-action'
import { startTransition, useActionState } from 'react'
import { TemplateDisplay } from './template-display'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { addTemplateByDrivePickerAction } from '@/backend/infrastructure/server-actions/add-template-by-drive-picker-action'

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
}

export function TemplateSection({
    certificateId,
    template,
    googleOAuthToken,
}: TemplateSectionProps) {
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

    // TODO: manter a lógica do templatedisplay nesse componente
    if (template) {
        return (
            <div className="space-y-8">
                <TemplateDisplay
                    googleOAuthToken={googleOAuthToken}
                    template={template}
                    certificateId={certificateId}
                    isAnySubmitionLoading={urlIsLoading || drivePickerIsLoading}
                    drivePickerState={driverPickerState}
                    urlState={urlState}
                    onSubmitDrive={handleSubmitDrive}
                    onSubmitUrl={handleSubmitUrl}
                />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        {/* <FileText className="h-5 w-5" /> */}
                        <CardTitle>Template do Certificado</CardTitle>
                    </div>
                    <CardDescription>
                        Selecione um template para gerar os certificados
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <FileSelector
                        googleOAuthToken={googleOAuthToken}
                        onSubmitUrl={handleSubmitUrl}
                        onSubmitDrive={handleSubmitDrive}
                        isLoading={urlIsLoading || drivePickerIsLoading}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
