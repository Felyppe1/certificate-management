import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createEmailAction } from '@/backend/infrastructure/server-actions/create-email-action'

export const emailFormSchema = z.object({
    subject: z.string().min(1, 'O assunto é obrigatório').max(255),
    body: z.string().min(1, 'O corpo do e-mail é obrigatório'),
    emailColumn: z.string().min(1, 'Selecione a coluna de e-mail').max(100),
    scheduledDate: z.string().optional(),
    scheduledTime: z.string().optional(),
})

export type EmailForm = z.infer<typeof emailFormSchema>

interface UseEmailFormProps {
    certificateId: string
    onSuccess?: () => void
    totalRecipients: number
    defaultValues?: EmailForm
}

export function useEmailForm({
    certificateId,
    onSuccess,
    totalRecipients,
    defaultValues,
}: UseEmailFormProps) {
    const form = useForm<EmailForm>({
        resolver: zodResolver(emailFormSchema),
        defaultValues,
    })

    const onSubmit = async (data: EmailForm) => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)
        formData.append('subject', data.subject)
        formData.append('body', data.body)
        formData.append('emailColumn', data.emailColumn)

        if (data.scheduledDate && data.scheduledTime) {
            const scheduledAt = new Date(
                `${data.scheduledDate}T${data.scheduledTime}`,
            )
            formData.append('scheduledAt', scheduledAt.toISOString())
        }

        const result = await createEmailAction(null, formData)

        if (!result?.success) {
            if (result.errorType === 'invalid-recipient-email') {
                toast.error(
                    'Há pelo menos um e-mail inválido na coluna selecionada',
                )
            } else {
                toast.error('Ocorreu um erro ao enviar o email')
            }

            return
        }

        toast.success(
            totalRecipients < 2
                ? 'Email enviado com sucesso'
                : 'Emails enviados com sucesso',
        )
        form.reset()
        onSuccess?.()
    }

    return {
        form,
        onSubmit,
    }
}
