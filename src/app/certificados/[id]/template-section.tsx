'use client'

import { FileSelector } from '@/components/FileSelector'
import { addTemplateByUrlAction } from '@/server-actions/add-template-by-url-action'
import { startTransition, useActionState } from 'react'

interface TemplateSectionProps {
    certificateId: string
}

export function TemplateSection({ certificateId }: TemplateSectionProps) {
    const [state, action, isLoading] = useActionState(
        addTemplateByUrlAction,
        null,
    )

    const handleSubmitUrl = async (formData: FormData) => {
        formData.append('certificateId', certificateId)

        startTransition(() => {
            action(formData)
        })
    }

    // TODO: exibir o template se existir
    return (
        <div className="space-y-8">
            <FileSelector onSubmitUrl={handleSubmitUrl} isLoading={isLoading} />
        </div>
    )
}
