'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { createCertificateEmissionAction } from '@/server-actions/create-certificate-emission-action'
import { useActionState } from 'react'

export function CreationForm() {
    const [state, action, isLoading] = useActionState(
        createCertificateEmissionAction,
        null,
    )

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button>Criar</Button>
            </PopoverTrigger>
            <PopoverContent>
                <form action={action}>
                    <label>Nome da emissão</label>
                    <Input type="text" name="name" placeholder="Nome" />
                </form>
            </PopoverContent>
        </Popover>
    )
}
