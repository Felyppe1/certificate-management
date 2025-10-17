'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Send, Calendar, CheckCircle2, Clock } from 'lucide-react'
import { useState } from 'react'

interface EmailSendingSectionProps {
    certificateId: string
    dataSourceColumns: string[]
    variablesMapped: boolean
    emailSent: boolean
    scheduledDate?: Date | null
}

export function EmailSendingSection({
    certificateId,
    dataSourceColumns,
    variablesMapped,
    emailSent,
    scheduledDate,
}: EmailSendingSectionProps) {
    const [emailColumn, setEmailColumn] = useState('')
    const [sendMode, setSendMode] = useState<'now' | 'scheduled'>('now')
    const [scheduledDateTime, setScheduledDateTime] = useState('')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [isSending, setIsSending] = useState(false)

    const handleSend = async () => {
        setIsSending(true)
        // TODO: Call API to send/schedule emails
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsSending(false)
    }

    const canSend = emailColumn && subject && message && variablesMapped
    const isScheduled = !!scheduledDate

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Envio de Email</CardTitle>
                        <CardDescription>
                            Configure e envie os certificados por email
                        </CardDescription>
                    </div>
                    {emailSent ? (
                        <Badge variant="green" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Enviado
                        </Badge>
                    ) : isScheduled ? (
                        <Badge variant="purple" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Agendado
                        </Badge>
                    ) : (
                        <Badge variant="outline">Pendente</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {!variablesMapped && (
                    <div className="bg-muted/50 border rounded-lg p-4">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 text-orange-600 dark:text-orange-400">
                                <svg
                                    className="w-5 h-5"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 16v-4M12 8h.01" />
                                </svg>
                            </div>
                            <div className="text-sm">
                                <p className="font-medium">
                                    Mapeamento necessário
                                </p>
                                <p className="text-muted-foreground">
                                    Complete o mapeamento de variáveis antes de
                                    enviar os emails. Os certificados serão
                                    gerados automaticamente no envio, se ainda
                                    não foram gerados.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {isScheduled && !emailSent && (
                    <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 text-purple-600 dark:text-purple-400">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div className="text-sm">
                                <p className="font-medium text-purple-900 dark:text-purple-100">
                                    Envio agendado
                                </p>
                                <p className="text-purple-700 dark:text-purple-300">
                                    Os emails serão enviados em{' '}
                                    {scheduledDate?.toLocaleString('pt-BR')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {emailSent && (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="text-sm">
                                <p className="font-medium text-green-900 dark:text-green-100">
                                    Emails enviados com sucesso
                                </p>
                                <p className="text-green-700 dark:text-green-300">
                                    Todos os certificados foram enviados para os
                                    destinatários.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email-column">
                            Coluna com Email dos Destinatários
                        </Label>
                        <Select
                            value={emailColumn}
                            onValueChange={setEmailColumn}
                        >
                            <SelectTrigger id="email-column">
                                <SelectValue placeholder="Selecione a coluna com os emails" />
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

                    <div className="space-y-3">
                        <Label>Modo de Envio</Label>
                        <RadioGroup
                            value={sendMode}
                            onValueChange={(value: 'now' | 'scheduled') =>
                                setSendMode(value)
                            }
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="now" id="send-now" />
                                <Label
                                    htmlFor="send-now"
                                    className="font-normal cursor-pointer"
                                >
                                    Enviar agora
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                    value="scheduled"
                                    id="send-scheduled"
                                />
                                <Label
                                    htmlFor="send-scheduled"
                                    className="font-normal cursor-pointer"
                                >
                                    Agendar envio
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {sendMode === 'scheduled' && (
                        <div className="space-y-2">
                            <Label htmlFor="scheduled-date">
                                Data e Hora do Envio
                            </Label>
                            <Input
                                id="scheduled-date"
                                type="datetime-local"
                                value={scheduledDateTime}
                                onChange={e =>
                                    setScheduledDateTime(e.target.value)
                                }
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email-subject">Assunto do Email</Label>
                        <Input
                            id="email-subject"
                            placeholder="Ex: Seu certificado está pronto!"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email-message">Mensagem</Label>
                        <Textarea
                            id="email-message"
                            placeholder="Digite a mensagem que será enviada junto com o certificado..."
                            rows={5}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">
                            O certificado será anexado automaticamente ao email.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button
                        size="lg"
                        onClick={handleSend}
                        disabled={!canSend || isSending || emailSent}
                    >
                        {isSending ? (
                            <>
                                <Mail className="h-4 w-4 mr-2 animate-pulse" />
                                {sendMode === 'now'
                                    ? 'Enviando...'
                                    : 'Agendando...'}
                            </>
                        ) : sendMode === 'now' ? (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Enviar Agora
                            </>
                        ) : (
                            <>
                                <Calendar className="h-4 w-4 mr-2" />
                                Agendar Envio
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
