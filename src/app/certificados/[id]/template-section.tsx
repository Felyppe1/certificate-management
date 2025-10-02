'use client'

import { FileSelector } from '@/components/FileSelector'
import { addTemplateByUrlAction } from '@/server-actions/add-template-by-url-action'
import { startTransition, useActionState } from 'react'
import { TemplateDisplay } from './template-display'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'

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
}

export function TemplateSection({
    certificateId,
    template,
}: TemplateSectionProps) {
    const [, action, isLoading] = useActionState(addTemplateByUrlAction, null)

    const handleSubmitUrl = async (formData: FormData) => {
        formData.append('certificateId', certificateId)

        startTransition(() => {
            action(formData)
        })
    }

    if (template) {
        return (
            <div className="space-y-8">
                <TemplateDisplay
                    template={template}
                    certificateId={certificateId}
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
                        onSubmitUrl={handleSubmitUrl}
                        isLoading={isLoading}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
