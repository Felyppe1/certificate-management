'use client'

import { CertificateTemplateCard } from './certificate-template-card'

interface SetFileUrlFormProps {
    certificateId: string
    template: {
        fileId: string
        fileName: string
        variables: string[]
    } | null
}

export function SetFileUrlForm({
    certificateId,
    template,
}: SetFileUrlFormProps) {
    return (
        <CertificateTemplateCard
            certificateId={certificateId}
            template={template}
        />
    )
}
