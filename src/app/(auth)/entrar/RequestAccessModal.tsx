'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { LockKeyhole, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { askForAccessAction } from '@/backend/infrastructure/server-actions/ask-for-access-action'
import { toast } from 'sonner'

const requestAccessSchema = z.object({
    email: z.email('Formato de email inválido'),
})

type RequestAccessFormData = z.infer<typeof requestAccessSchema>

export function RequestAccessModal() {
    const [open, setOpen] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<RequestAccessFormData>({
        resolver: zodResolver(requestAccessSchema),
    })

    const mutation = useMutation({
        mutationFn: async (data: RequestAccessFormData) => {
            const formData = new FormData()
            formData.append('email', data.email)

            const result = await askForAccessAction(null, formData)

            if (!result?.success) {
                toast.error('Ocorreu um erro ao enviar sua solicitação.')
            }

            return result
        },
    })

    const handleOpenChange = (value: boolean) => {
        setOpen(value)
        if (!value) {
            mutation.reset()
            reset()
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 cursor-pointer">
                    Não tem acesso? Solicite aqui
                </button>
            </DialogTrigger>

            <DialogContent>
                {mutation.isSuccess ? (
                    <div className="flex flex-col items-center gap-4 py-4 text-center">
                        <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <DialogTitle>Solicitação enviada!</DialogTitle>
                        <DialogDescription>
                            Recebemos seu pedido de acesso. Quando for aprovado,
                            você receberá um email com as instruções para entrar
                            na plataforma.
                        </DialogDescription>
                        <Button
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            className="mt-2"
                        >
                            Fechar
                        </Button>
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit(data => mutation.mutate(data))}
                    >
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                    <LockKeyhole className="w-5 h-5" />
                                </div>
                                <DialogTitle>Solicitar acesso</DialogTitle>
                            </div>
                            <DialogDescription>
                                O Certifica está em fase de testes e o acesso é
                                feito por convite. Informe seu email abaixo e
                                entraremos em contato assim que seu acesso for
                                liberado.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-2 my-6">
                            <Label htmlFor="request-email">Seu email</Label>
                            <Input
                                id="request-email"
                                type="email"
                                placeholder="nome@email.com"
                                {...register('email')}
                                aria-invalid={!!errors.email}
                            />
                            {errors.email && (
                                <span className="text-sm text-destructive">
                                    {errors.email.message}
                                </span>
                            )}
                            {mutation.isError && (
                                <span className="text-sm text-destructive">
                                    {mutation.error.message}
                                </span>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending
                                    ? 'Enviando...'
                                    : 'Solicitar acesso'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
