import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { addTemplateByUrlAction } from '@/backend/infrastructure/server-actions/add-template-by-url-action'

export const templateUrlFormSchema = z.object({
    fileUrl: z.url('URL inválida'),
})

export type TemplateUrlForm = z.infer<typeof templateUrlFormSchema>

interface UseTemplateUrlFormProps {
    certificateId: string
    onSuccess?: () => void
}

export function useTemplateUrlForm({
    certificateId,
    onSuccess,
}: UseTemplateUrlFormProps) {
    const form = useForm<TemplateUrlForm>({
        resolver: zodResolver(templateUrlFormSchema),
        defaultValues: { fileUrl: '' },
    })

    const onSubmit = async (data: TemplateUrlForm) => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)
        formData.append('fileUrl', data.fileUrl)

        const result = await addTemplateByUrlAction(null, formData)

        if (!result?.success) {
            if (result.errorType === 'drive-file-not-found') {
                toast.error(
                    'Arquivo não encontrado. Verifique se a URL está correta e se o arquivo no Drive está público',
                )
            } else if (result.errorType === 'unsupported-template-mimetype') {
                toast.error(
                    'Tipo de arquivo não suportado. Apenas Google Slides, Google Docs, .pptx ou .docx são permitidos',
                )
            } else if (
                result.errorType === 'template-variables-parsing-error'
            ) {
                toast.error(
                    'Foi encontrado um erro de sintaxe do Liquid no template.',
                )
            } else {
                toast.error('Ocorreu um erro ao tentar adicionar template')
            }

            return
        }

        toast.success('Template adicionado com sucesso')
        form.reset()
        onSuccess?.()
    }

    return {
        form,
        onSubmit: form.handleSubmit(onSubmit),
        isSubmitting: form.formState.isSubmitting,
        errors: form.formState.errors,
    }
}
