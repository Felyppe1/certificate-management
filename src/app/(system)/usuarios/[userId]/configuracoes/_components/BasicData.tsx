'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, User } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMe } from '@/custom-hooks/use-me'
import { queryKeys } from '@/lib/query-keys'
import { updateUserBasicDataAction } from '@/backend/infrastructure/server-actions/update-user-basic-data-action'

const schema = z.object({
    name: z
        .string()
        .min(3, 'Mínimo de 3 caracteres')
        .max(50, 'Máximo de 50 caracteres'),
})

type FormData = z.infer<typeof schema>

export function BasicData() {
    const queryClient = useQueryClient()
    const { data } = useMe()
    const { name } = data.user

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { name },
    })

    const mutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const fd = new FormData()
            fd.append('name', formData.name)
            const result = await updateUserBasicDataAction(null, fd)
            if (result?.success === false) throw result
            return result
        },
        onSuccess: () => {
            toast.success('Nome atualizado.')
            queryClient.invalidateQueries({ queryKey: queryKeys.me() })
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return
            toast.error('Erro ao atualizar nome. Tente novamente.')
        },
    })

    return (
        <Card>
            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-1">
                        Dados Básicos
                    </h2>
                    <p className="text-muted-foreground font-light">
                        Gerencie suas informações pessoais
                    </p>
                </div>
            </div>

            <form
                onSubmit={handleSubmit(data => mutation.mutate(data))}
                className="space-y-4"
            >
                <div className="space-y-2">
                    <Label htmlFor="basic-name">Nome</Label>
                    <Input
                        id="basic-name"
                        type="text"
                        placeholder="Seu nome"
                        {...register('name')}
                        aria-invalid={!!errors.name}
                    />
                    {errors.name && (
                        <span className="text-sm text-destructive">
                            {errors.name.message}
                        </span>
                    )}
                </div>

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={mutation.isPending}
                        data-testid="basic-name-save-button"
                    >
                        {mutation.isPending && (
                            <Loader2 className="animate-spin" />
                        )}
                        Salvar
                    </Button>
                </div>
            </form>
        </Card>
    )
}
