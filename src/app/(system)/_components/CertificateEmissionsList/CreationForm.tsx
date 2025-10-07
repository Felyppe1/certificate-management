'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { createCertificateEmissionAction } from '@/backend/infrastructure/server-actions/create-certificate-emission-action'
import { useActionState } from 'react'
import { Plus, Loader2 } from 'lucide-react'

export function CreationForm() {
    const [, action, isLoading] = useActionState(
        createCertificateEmissionAction,
        null,
    )

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button size="lg">
                    <Plus className="size-6" />
                    Criar
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-90" side="left">
                <form action={action} className="space-y-5">
                    <div className="space-y-4">
                        <label
                            htmlFor="emission-name"
                            className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2"
                        >
                            Nome da emissão
                        </label>
                        <Input
                            id="emission-name"
                            type="text"
                            name="name"
                            placeholder="Ex: Seminário sobre Cybersecurity"
                            required
                            className="w-full mt-3 py-5 dark:bg-bg"
                            disabled={isLoading}
                        />
                    </div>
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="size-5 animate-spin" />
                                Criando...
                            </>
                        ) : (
                            'Criar Emissão'
                        )}
                    </Button>
                </form>
            </PopoverContent>
        </Popover>
    )
}
