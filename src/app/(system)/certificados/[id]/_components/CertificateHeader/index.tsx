'use client'

import { updateCertificateEmissionAction } from '@/backend/infrastructure/server-actions/update-certificate-emission-action'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Check, Pencil, X } from 'lucide-react'
import {
    startTransition,
    useActionState,
    useEffect,
    useRef,
    useState,
} from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

interface CertificateHeaderProps {
    certificateId: string
    initialName: string
    status: string
}

const statusMapping = {
    DRAFT: 'Rascunho',
    EMITTED: 'Emitido',
    SCHEDULED: 'Agendado',
}

const nameSchema = z
    .string()
    .min(1, 'O nome não pode ser vazio')
    .max(100, 'O nome deve ter no máximo 100 caracteres')

export function CertificateHeader({
    certificateId,
    initialName,
    status,
}: CertificateHeaderProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [name, setName] = useState(initialName)
    const [previousName, setPreviousName] = useState(initialName)
    const inputRef = useRef<HTMLInputElement>(null)

    const [state, action, isPending] = useActionState(
        updateCertificateEmissionAction,
        null,
    )

    const handleEditClick = () => {
        setPreviousName(name)
        setIsEditing(true)
        // Focus input after render
        setTimeout(() => inputRef.current?.focus(), 0)
    }

    const handleCancel = () => {
        setName(previousName)
        setIsEditing(false)
    }

    const handleSave = () => {
        const validation = nameSchema.safeParse(name.trim())

        if (!validation.success) {
            toast.error(validation.error.issues[0].message)
            return
        }

        const validName = validation.data

        if (validName === previousName) {
            setIsEditing(false)
            return
        }

        const formData = new FormData()
        formData.append('id', certificateId)
        formData.append('name', validName)

        startTransition(() => {
            action(formData)
        })
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave()
        } else if (e.key === 'Escape') {
            handleCancel()
        }
    }

    useEffect(() => {
        if (state?.success) {
            toast.success('Nome atualizado com sucesso')
            setIsEditing(false)
            setPreviousName(name)
        } else if (state && !state.success) {
            toast.error('Erro ao atualizar o nome')
        }
    }, [state])

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 md:gap-4 flex-wrap min-h-[3rem]">
                {isEditing ? (
                    <div className="flex items-center gap-2 w-full sm:w-[70%] max-w-2xl">
                        <Input
                            ref={inputRef}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="text-2xl sm:text-3xl h-auto sm:h-auto pt-0.5 pb-1 sm:pt-1 sm:pb-2 px-4 sm:px-5 font-bold bg-background flex-1"
                            disabled={isPending}
                        />
                        <div className="flex items-center gap-2">
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={handleSave}
                                disabled={isPending}
                                className="h-10 w-10 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
                            >
                                <Check className="h-5 w-5" strokeWidth={1.5} />
                            </Button>
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={handleCancel}
                                disabled={isPending}
                                className="h-10 w-10 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                                <X className="h-5 w-5" strokeWidth={1.5} />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 group">
                        <h1 className="text-3xl sm:text-4xl font-bold">
                            {name}
                        </h1>
                        <Button
                            size="icon"
                            variant="outline"
                            onClick={handleEditClick}
                            title="Editar nome do certificado"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                <Badge
                    variant={
                        status === 'EMITTED'
                            ? 'green'
                            : status === 'DRAFT'
                              ? 'orange'
                              : 'purple'
                    }
                    size="lg"
                >
                    {statusMapping[status as keyof typeof statusMapping]}
                </Badge>
            </div>

            <p className="text-foreground/90 text-base sm:text-lg font-light">
                Gerencie esta emissão de certificados
            </p>
        </div>
    )
}
