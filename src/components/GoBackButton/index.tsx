'use client'

import { useRouter } from 'next/navigation'
import { Button } from '../ui/button'
import { ArrowLeft } from 'lucide-react'

export function GoBackButton() {
    const router = useRouter()

    const handleBack = () => {
        // TODO: try to track the history myself and prevent user from leaving the app
        router.back()
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="mb-6"
        >
            <ArrowLeft className="w-4 h-4" />
            Voltar
        </Button>
    )
}
