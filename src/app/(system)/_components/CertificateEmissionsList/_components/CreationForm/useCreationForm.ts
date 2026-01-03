// use-creation-form.ts
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createCertificateEmissionAction } from '@/backend/infrastructure/server-actions/create-certificate-emission-action'

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

    const form = useForm<CertificateEmissionForm>({
        resolver: zodResolver(createCertificateEmissionFormSchema),
        defaultValues: { name: '' },
    })

    const onSubmit = async (data: CertificateEmissionForm) => {
        const formData = new FormData()
        formData.append('name', data.name)

        const result = await createCertificateEmissionAction(null, formData)

        if (result?.success === false) {
            toast.error('Erro ao criar emissão de certificado')
            return
        }

        toast.success('Emissão criada com sucesso!')
        form.reset()
        setIsOpen(false)
    }

    return {
        isOpen,
        setIsOpen,
        form,
        onSubmit: form.handleSubmit(onSubmit),
        isSubmitting: form.formState.isSubmitting,
        errors: form.formState.errors,
    }
}
