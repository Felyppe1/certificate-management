'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Megaphone } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { grantAccessAction } from '@/backend/infrastructure/server-actions/grant-access-action'
import { useMe } from '@/custom-hooks/useMe'

const ADMIN_EMAILS = ['felyppe.nunes1@gmail.com', 'luizfelyppe@id.uff.br']

const grantAccessSchema = z.object({
    email: z.email('Formato de email inválido'),
    fromForm: z.boolean(),
    isRealCase: z.boolean(),
})

type GrantAccessFormData = z.infer<typeof grantAccessSchema>

export function GrantAccess() {
    const { data } = useMe()

    if (!ADMIN_EMAILS.includes(data.user.email ?? '')) return null

    return <GrantAccessForm />
}

function GrantAccessForm() {
    const {
        register,
        handleSubmit,
        reset,
        watch,
        control,
        formState: { errors },
    } = useForm<GrantAccessFormData>({
        resolver: zodResolver(grantAccessSchema),
        defaultValues: { fromForm: false, isRealCase: false },
    })

    const fromForm = watch('fromForm')

    const mutation = useMutation({
        mutationFn: async (data: GrantAccessFormData) => {
            const formData = new FormData()
            formData.append('email', data.email)
            formData.append('fromForm', data.fromForm ? 'true' : 'false')
            formData.append('isRealCase', data.isRealCase ? 'true' : 'false')
            const result = await grantAccessAction(null, formData)

            if (!result?.success) {
                throw new Error(
                    'Ocorreu um erro ao enviar o email de notificação.',
                )
            }

            return result
        },
        onSuccess: () => {
            toast.success('Email de acesso enviado com sucesso!')
            reset()
        },
        onError: error => {
            toast.error(error.message)
        },
    })

    return (
        <Card>
            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <Megaphone className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-1">
                        Notificar Acesso
                    </h2>
                    <p className="text-muted-foreground font-light">
                        Envie um email de notificação para o usuário sobre a
                        liberação do acesso à plataforma
                    </p>
                </div>
            </div>

            <form
                onSubmit={handleSubmit(data => mutation.mutate(data))}
                className="space-y-4"
            >
                <div className="space-y-2">
                    <Label htmlFor="grant-email">Email do usuário</Label>
                    <Input
                        id="grant-email"
                        type="email"
                        placeholder="usuario@email.com"
                        {...register('email')}
                        aria-invalid={!!errors.email}
                    />
                    {errors.email && (
                        <span className="text-sm text-destructive">
                            {errors.email.message}
                        </span>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Controller
                            name="fromForm"
                            control={control}
                            render={({ field }) => (
                                <Checkbox
                                    id="from-form"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                        />
                        <Label
                            htmlFor="from-form"
                            className="cursor-pointer font-normal"
                        >
                            Proveniente do formulário
                        </Label>
                    </div>

                    {fromForm && (
                        <div className="flex items-center gap-2 pl-6">
                            <Controller
                                name="isRealCase"
                                control={control}
                                render={({ field }) => (
                                    <Checkbox
                                        id="is-real-case"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                            <Label
                                htmlFor="is-real-case"
                                className="cursor-pointer font-normal"
                            >
                                É caso real
                            </Label>
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <Button type="submit" disabled={mutation.isPending}>
                        {mutation.isPending && (
                            <Loader2 className="animate-spin" />
                        )}
                        Enviar email
                    </Button>
                </div>
            </form>
        </Card>
    )
}
