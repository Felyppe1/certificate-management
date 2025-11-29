import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Mail, Send, Calendar, Loader2 } from 'lucide-react'
import { FormEvent } from 'react'

interface EmailFormProps {
    subject: string
    message: string
    emailColumn: string
    dataSourceColumns: string[]
    totalRecords: number
    onSubjectChange: (value: string) => void
    onMessageChange: (value: string) => void
    onEmailColumnChange: (value: string) => void
    onSubmit: () => void
    certificatesGenerated: boolean
    isSending: boolean
    isDisabled: boolean
    sendMode: 'now' | 'scheduled'
    scheduledDateTime?: string
    scheduledTime?: string
    onScheduledDateTimeChange?: (value: string) => void
    onScheduledTimeChange?: (value: string) => void
}

export function EmailForm({
    subject,
    message,
    emailColumn,
    dataSourceColumns,
    totalRecords,
    onSubjectChange,
    onMessageChange,
    onEmailColumnChange,
    onSubmit,
    certificatesGenerated,
    isSending,
    isDisabled,
    sendMode,
    scheduledDateTime,
    scheduledTime,
    onScheduledDateTimeChange,
    onScheduledTimeChange,
}: EmailFormProps) {
    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!isDisabled) {
            onSubmit()
        }
    }

    const allFieldsAreFilled =
        subject.trim() !== '' &&
        message.trim() !== '' &&
        emailColumn.trim() !== '' &&
        (sendMode === 'now' || (scheduledDateTime && scheduledTime))

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
                <Label htmlFor={`email-column-${sendMode}`}>
                    Coluna com Email dos Destinatários
                </Label>
                <Select
                    value={emailColumn}
                    onValueChange={onEmailColumnChange}
                    disabled={isDisabled}
                >
                    <SelectTrigger
                        id={`email-column-${sendMode}`}
                        className="w-full"
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
            </div>

            {sendMode === 'scheduled' && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="scheduled-date">Data</Label>
                        <Input
                            id="scheduled-date"
                            type="date"
                            value={scheduledDateTime}
                            onChange={e =>
                                onScheduledDateTimeChange?.(e.target.value)
                            }
                            disabled={isDisabled}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="scheduled-time">Horário</Label>
                        <Input
                            id="scheduled-time"
                            type="time"
                            value={scheduledTime}
                            onChange={e =>
                                onScheduledTimeChange?.(e.target.value)
                            }
                            disabled={isDisabled}
                        />
                    </div>
                </div>
            )}

            <div className="space-y-3">
                <Label htmlFor={`email-subject-${sendMode}`}>
                    Assunto do Email
                </Label>
                <Input
                    className={sendMode === 'now' ? 'bg-background' : ''}
                    id={`email-subject-${sendMode}`}
                    placeholder="Ex: Seu certificado está pronto!"
                    value={subject}
                    onChange={e => onSubjectChange(e.target.value)}
                    disabled={isDisabled}
                />
            </div>

            <div className="space-y-3">
                <Label htmlFor={`email-message-${sendMode}`}>Mensagem</Label>
                <Textarea
                    className="resize-none min-h-24"
                    id={`email-message-${sendMode}`}
                    placeholder="Digite o corpo do email que será enviado"
                    value={message}
                    onChange={e => onMessageChange(e.target.value)}
                    disabled={isDisabled}
                />
            </div>

            <div className="flex gap-4 items-center justify-between p-6 border rounded-lg dark:bg-input/30 mt-10">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                        <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <p className="font-medium text-lg">
                            {totalRecords}{' '}
                            {totalRecords <= 1
                                ? 'destinatário'
                                : 'destinatários'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {true /* certificatesGenerated */
                                ? totalRecords <= 1
                                    ? 'receberá o certificado'
                                    : 'receberão os certificados'
                                : totalRecords <= 1
                                  ? 'será gerado'
                                  : 'serão gerados'}
                        </p>
                    </div>
                </div>
                <Button
                    type="submit"
                    size="lg"
                    disabled={isDisabled || isSending || !allFieldsAreFilled}
                >
                    {isSending ? (
                        <>
                            <Loader2 className="animate-spin" />
                            {sendMode === 'now'
                                ? 'Enviando...'
                                : 'Agendando...'}
                        </>
                    ) : (
                        <>
                            {sendMode === 'now' ? (
                                <>
                                    <Send />
                                    Enviar Agora
                                </>
                            ) : (
                                <>
                                    <Calendar />
                                    Agendar Envio
                                </>
                            )}
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}
