'use client'

import { STATUS_MAPPING } from '@/app/(system)/_components/CertificateEmissionsList/_components/List/ListRenderer'
import { deleteCertificateEmissionAction } from '@/backend/infrastructure/server-actions/delete-certificate-emission-action'
import { updateCertificateEmissionAction } from '@/backend/infrastructure/server-actions/update-certificate-emission-action'
import { WarningPopover } from '@/components/WarningPopover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
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

// const STATUS_MAPPING = {
//     DRAFT: 'Rascunho',
//     EMITTED: 'Emitido',
//     SCHEDULED: 'Agendado',
//     GENERATED: 'Gerado',
// }

const nameSchema = z
    .string()
    .min(1, 'O nome não pode ser vazio')
    .max(100, 'O nome deve ter no máximo 100 caracteres')

export function CertificateHeader({
    certificateId,
    initialName,
    status,
}: CertificateHeaderProps) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [showDeleteWarning, setShowDeleteWarning] = useState(false)
    const [name, setName] = useState(initialName)
    const [previousName, setPreviousName] = useState(initialName)
    const inputRef = useRef<HTMLInputElement>(null)

    const [state, action, isPending] = useActionState(
        updateCertificateEmissionAction,
        null,
    )

    const [deleteState, deleteAction, isDeleting] = useActionState(
        deleteCertificateEmissionAction,
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
        formData.append('variableColumnMapping', 'undefined')

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

    const handleDeleteCertificateEmission = () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)

        startTransition(() => {
            deleteAction(formData)
        })
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

    useEffect(() => {
        if (!deleteState) return

        if (deleteState.success) {
            toast.success('Certificado excluído com sucesso')
            router.push('/')
            return
        }

        toast.error('Ocorreu um erro ao excluir o certificado')
    }, [deleteState, router])

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
                            disabled={isPending || isDeleting}
                        />
                        <div className="flex items-center gap-2">
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={handleSave}
                                disabled={isPending || isDeleting}
                                className="h-10 w-10 text-green-600 hover:text-green-500"
                            >
                                <Check className="h-5 w-5" strokeWidth={3} />
                            </Button>
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={handleCancel}
                                disabled={isPending || isDeleting}
                                className="h-10 w-10 text-red-600 hover:text-red-500"
                            >
                                <X className="h-5 w-5" strokeWidth={3} />
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
                            disabled={isDeleting || isPending}
                            title="Editar nome do certificado"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                        {status !== 'EMITTED' && (
                            <WarningPopover
                                open={showDeleteWarning}
                                onOpenChange={setShowDeleteWarning}
                                onConfirm={handleDeleteCertificateEmission}
                                title="Excluir certificado?"
                                description="Essa ação é permanente e não pode ser desfeita."
                            >
                                <Button
                                    size="icon"
                                    variant="outline"
                                    disabled={isDeleting || isPending}
                                    title="Excluir certificado"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </WarningPopover>
                        )}
                    </div>
                )}

                <Badge
                    variant={
                        status === 'DRAFT'
                            ? 'orange'
                            : status === 'GENERATED'
                              ? 'blue'
                              : status === 'SCHEDULED'
                                ? 'purple'
                                : 'green'
                    }
                    size="lg"
                >
                    {STATUS_MAPPING[status as keyof typeof STATUS_MAPPING]}
                </Badge>
            </div>

            <p className="text-foreground/90 text-base sm:text-lg font-light">
                Gerencie esta emissão de certificados
            </p>
        </div>
    )
}
