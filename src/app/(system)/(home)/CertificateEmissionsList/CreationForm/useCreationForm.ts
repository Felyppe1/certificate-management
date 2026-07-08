import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createCertificateEmissionAction } from '@/backend/infrastructure/server-actions/create-certificate-emission-action'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { useRouter } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

export const createCertificateEmissionFormSchema = z.object({
    name: z
        .string()
        .min(1, 'Esse campo é obrigatório')
        .max(100, 'Máximo de 100 caracteres ultrapassado'),
})

export type CertificateEmissionForm = z.infer<
    typeof createCertificateEmissionFormSchema
>

export function useCreationForm() {
    const [isOpen, setIsOpen] = useState(false)
    const queryClient = useQueryClient()
    const router = useRouter()
    const [isLoading, startTransition] = useTransition()

    const form = useForm<CertificateEmissionForm>({
        resolver: zodResolver(createCertificateEmissionFormSchema),
        defaultValues: { name: '' },
    })

    const mutation = useMutation({
        mutationFn: async (data: CertificateEmissionForm) => {
            const formData = new FormData()
            formData.append('name', data.name)
            const result = await createCertificateEmissionAction(null, formData)
            if (result?.success === false) {
                throw result
            }
            return result
        },
        onSuccess: async data => {
            toast.success('Emissão criada com sucesso!')
            await queryClient.invalidateQueries({
                queryKey: queryKeys.certificateEmissions(),
            })

            startTransition(() => {
                router.push('/certificados/' + data.certificateEmissionId)
            })

            // form.reset()
            // setIsOpen(false)
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return

            console.log(error)
            toast.error('Erro ao criar emissão de certificado')
        },
    })

    return {
        isOpen,
        setIsOpen,
        form,
        onSubmit: form.handleSubmit(data => mutation.mutate(data)),
        isSubmitting: mutation.isPending || isLoading,
        errors: form.formState.errors,
    }
}
