'use client'

import { useRouter } from 'next/navigation'
import { Button } from '../ui/button'
import { ArrowLeft } from 'lucide-react'

export function GoBackButton() {
    const router = useRouter()

    const handleBack = () => {
        if (window.history.length > 1) {
            router.back()
        } else {
            router.push('/')
        }
    }

    return (
        <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
            Voltar
        </Button>
    )
}
