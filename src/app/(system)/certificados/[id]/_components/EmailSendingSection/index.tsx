'use client'

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Send, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { startTransition, useActionState, useState } from 'react'
import { AlertMessage } from '@/components/ui/alert-message'
import { EmailForm } from './EmailForm'
import { createEmailAction } from '@/backend/infrastructure/server-actions/create-email-action'

interface EmailSendingSectionProps {
    certificateId: string
    dataSourceColumns: string[]
    variablesMapped: boolean
    emailSent: boolean
    scheduledDate?: Date | null
    totalRecipients: number
}

export function EmailSendingSection({
    certificateId,
    dataSourceColumns,
    variablesMapped,
    emailSent,
    scheduledDate,
    totalRecipients,
}: EmailSendingSectionProps) {
    const [state, action, isPending] = useActionState(createEmailAction, null)

    const [emailColumn, setEmailColumn] = useState('')
    const [sendMode, setSendMode] = useState<'now' | 'scheduled'>('now')
    const [scheduledDateTime, setScheduledDateTime] = useState('')
    const [scheduledTime, setScheduledTime] = useState('')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')

    const handleSend = async () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)
        formData.append('subject', subject)
        formData.append('body', message)
        formData.append('emailColumn', emailColumn)

        let scheduledAt = null
        if (sendMode === 'scheduled' && scheduledDateTime && scheduledTime) {
            scheduledAt = new Date(`${scheduledDateTime}T${scheduledTime}`)
        }

        if (scheduledAt) {
            formData.append('scheduledAt', scheduledAt.toISOString())
        }

        startTransition(() => {
            action(formData)
        })
    }

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
                    {/* {emailSent ? (
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
                    )} */}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Alert: Mapping Required */}
                {!variablesMapped && !emailSent && !isScheduled && (
                    <AlertMessage
                        variant="warning"
                        icon={<AlertCircle className="w-5 h-5" />}
                        text="Mapeamento de variáveis necessário"
                        description="Complete o mapeamento de variáveis para poder enviar os certificados."
                    />
                )}

                {/* Alert: Already Scheduled */}
                {isScheduled && !emailSent && (
                    <AlertMessage
                        variant="purple"
                        icon={<Clock className="w-5 h-5" />}
                        text="Envio agendado"
                        description={`Os emails serão enviados em ${scheduledDate?.toLocaleString('pt-BR')}`}
                    />
                )}

                {/* Alert: Already Sent */}
                {emailSent && (
                    <AlertMessage
                        variant="success"
                        icon={<CheckCircle2 className="w-5 h-5" />}
                        text="Emails enviados com sucesso"
                        description="Todos os certificados foram enviados para os destinatários."
                    />
                )}

                {/* Send Mode Tabs */}
                {!emailSent && !isScheduled && (
                    <>
                        <Tabs
                            value={sendMode}
                            onValueChange={value =>
                                setSendMode(value as 'now' | 'scheduled')
                            }
                        >
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger
                                    value="now"
                                    disabled={emailSent || isScheduled}
                                >
                                    <Send className="h-4 w-4" />
                                    Enviar Agora
                                </TabsTrigger>
                                <TabsTrigger
                                    value="scheduled"
                                    disabled={emailSent || isScheduled}
                                >
                                    <Calendar className="h-4 w-4" />
                                    Agendar Envio
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="now" className="space-y-4 mt-4">
                                <EmailForm
                                    subject={subject}
                                    message={message}
                                    emailColumn={emailColumn}
                                    dataSourceColumns={dataSourceColumns}
                                    totalRecords={totalRecipients}
                                    onSubjectChange={setSubject}
                                    onMessageChange={setMessage}
                                    onEmailColumnChange={setEmailColumn}
                                    onSubmit={handleSend}
                                    isSending={isPending}
                                    isDisabled={emailSent || isScheduled}
                                    sendMode="now"
                                />
                            </TabsContent>

                            <TabsContent
                                value="scheduled"
                                className="space-y-6 mt-4"
                            >
                                <AlertMessage
                                    variant="info"
                                    icon={<Clock className="w-5 h-5" />}
                                    text="Os emails serão enviados automaticamente na data e hora agendadas."
                                />

                                <EmailForm
                                    subject={subject}
                                    message={message}
                                    emailColumn={emailColumn}
                                    dataSourceColumns={dataSourceColumns}
                                    totalRecords={totalRecipients}
                                    onSubjectChange={setSubject}
                                    onMessageChange={setMessage}
                                    onEmailColumnChange={setEmailColumn}
                                    onSubmit={handleSend}
                                    isSending={isPending}
                                    isDisabled={emailSent || isScheduled}
                                    sendMode="scheduled"
                                    scheduledDateTime={scheduledDateTime}
                                    scheduledTime={scheduledTime}
                                    onScheduledDateTimeChange={
                                        setScheduledDateTime
                                    }
                                    onScheduledTimeChange={setScheduledTime}
                                />
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
