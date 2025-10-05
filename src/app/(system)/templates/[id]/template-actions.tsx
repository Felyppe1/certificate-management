'use client'

import { Button } from '@/components/ui/button'
import { Download, ExternalLink } from 'lucide-react'

interface TemplateActionsProps {
    inputMethod: 'URL' | 'GOOGLE_DRIVE' | 'UPLOAD'
    driveFileId: string | null
    storageFileUrl: string | null
}

export function TemplateActions({
    inputMethod,
    driveFileId,
    storageFileUrl,
}: TemplateActionsProps) {
    const handleDownload = () => {
        if (storageFileUrl) {
            window.open(storageFileUrl, '_blank')
        }
    }

    const handleOpenExternal = () => {
        if (driveFileId) {
            const driveUrl = `https://drive.google.com/file/d/${driveFileId}/view`
            window.open(driveUrl, '_blank')
        }
    }

    return (
        <div className="flex gap-2">
            {inputMethod === 'UPLOAD' && storageFileUrl && (
                <Button onClick={handleDownload} className="gap-2">
                    <Download className="h-4 w-4" />
                    Baixar Arquivo
                </Button>
            )}

            {(inputMethod === 'GOOGLE_DRIVE' || inputMethod === 'URL') &&
                driveFileId && (
                    <Button
                        onClick={handleOpenExternal}
                        variant="outline"
                        className="gap-2"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Abrir no Drive
                    </Button>
                )}
        </div>
    )
}
