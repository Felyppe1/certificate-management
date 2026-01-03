import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { addDataSourceByUrlAction } from '@/backend/infrastructure/server-actions/add-data-source-by-url-action'

export const dataSourceUrlFormSchema = z.object({
    fileUrl: z.url('URL inválida'),
})

export type DataSourceUrlForm = z.infer<typeof dataSourceUrlFormSchema>

interface UseDataSourceUrlFormProps {
    certificateId: string
    onSuccess?: () => void
}

export function useDataSourceUrlForm({
    certificateId,
    onSuccess,
}: UseDataSourceUrlFormProps) {
    const form = useForm<DataSourceUrlForm>({
        resolver: zodResolver(dataSourceUrlFormSchema),
        defaultValues: { fileUrl: '' },
    })

    const onSubmit = async (data: DataSourceUrlForm) => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)
        formData.append('fileUrl', data.fileUrl)

        const result = await addDataSourceByUrlAction(null, formData)

        if (!result?.success) {
            if (result.errorType === 'drive-file-not-found') {
                toast.error(
                    'Arquivo não encontrado. Verifique se a URL está correta e se o arquivo no Drive está público',
                )
            } else if (
                result.errorType === 'unsupported-data-source-mimetype'
            ) {
                toast.error(
                    'Tipo de arquivo não suportado. Apenas Google Planilhas, .csv ou .xlsx são permitidos',
                )
            } else {
                toast.error(
                    'Ocorreu um erro ao tentar adicionar fonte de dados',
                )
            }

            return
        }

        toast.success('Fonte de dados adicionada com sucesso')
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
