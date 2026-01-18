'use client'

import { FormEvent } from 'react'
import { Mail, Send, Calendar, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { UseFormReturn, useWatch } from 'react-hook-form'
import { EmailForm as EmailFormType } from './useEmailForm'

interface EmailFormProps {
    dataSourceColumns: string[]
    totalRecords: number
    certificatesGenerated: boolean
    isDisabled: boolean
    sendMode: 'now' | 'scheduled'
    form: UseFormReturn<EmailFormType>
    onSubmit: (data: EmailFormType) => Promise<void>
}

export function EmailForm({
    dataSourceColumns,
    totalRecords,
    onSubmit,
    isDisabled,
    sendMode,
    form,
}: EmailFormProps) {
    const {
        register,
        setValue,
        formState: { errors, isValid, isSubmitting },
        handleSubmit,
    } = form

    const emailColumnValue = useWatch({
        control: form.control,
        name: 'emailColumn',
    })

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-3">
                <Label htmlFor={`email-column-${sendMode}`}>
                    Coluna com Email dos Destinatários
                </Label>
                <div>
                    <Select
                        value={emailColumnValue}
                        onValueChange={value =>
                            setValue('emailColumn', value, {
                                shouldValidate: true,
                            })
                        }
                        disabled={isDisabled}
                    >
                        <SelectTrigger
                            className="w-full"
                            aria-invalid={!!errors?.emailColumn}
                        >
                            <SelectValue placeholder="Selecionar coluna" />
                        </SelectTrigger>
                        <SelectContent>
                            {dataSourceColumns.map(column => (
                                <SelectItem key={column} value={column}>
                                    {column}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors?.emailColumn && (
                        <span className="text-sm text-destructive">
                            {errors.emailColumn.message}
                        </span>
                    )}
                </div>
            </div>

            {sendMode === 'scheduled' && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Data</Label>
                        <Input
                            type="date"
                            {...register('scheduledDate')}
                            disabled={isDisabled}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Horário</Label>
                        <Input
                            type="time"
                            {...register('scheduledTime')}
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <Label htmlFor={`email-subject-${sendMode}`}>
                    Assunto do Email
                </Label>
                <div>
                    <Input
                        {...register('subject')}
                        id={`email-subject-${sendMode}`}
                        placeholder="Ex: Seu certificado está pronto!"
                        disabled={isDisabled}
                        aria-invalid={!!errors?.subject}
                    />
                    {errors?.subject && (
                        <span className="text-sm text-destructive">
                            {errors.subject.message}
                        </span>
                    )}
                </div>
            </div>

            <div className="space-y-3">
                <Label htmlFor={`email-message-${sendMode}`}>Mensagem</Label>
                <div>
                    <Textarea
                        {...register('body')}
                        className="resize-none min-h-24"
                        id={`email-message-${sendMode}`}
                        placeholder="Digite o corpo do email..."
                        disabled={isDisabled}
                        aria-invalid={!!errors?.body}
                    />
                    {errors?.body && (
                        <span className="text-sm text-destructive">
                            {errors.body.message}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex gap-4 items-center justify-between flex-wrap p-6 py-4 border rounded-lg dark:bg-input/30 mt-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                        <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <div>
                        <p className="font-medium">
                            {totalRecords}{' '}
                            {totalRecords <= 1
                                ? 'destinatário'
                                : 'destinatários'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            receberá o certificado
                        </p>
                    </div>
                </div>

                <Button
                    type="submit"
                    size="lg"
                    disabled={isDisabled || isSubmitting || !isValid}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="animate-spin " />
                            {sendMode === 'now'
                                ? 'Enviando...'
                                : 'Agendando...'}
                        </>
                    ) : (
                        <>
                            {sendMode === 'now' ? (
                                <Send className="" />
                            ) : (
                                <Calendar className="" />
                            )}
                            {sendMode === 'now'
                                ? 'Enviar Agora'
                                : 'Agendando Envio'}
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}
