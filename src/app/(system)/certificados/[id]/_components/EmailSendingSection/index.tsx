'use client'

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
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Send, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { AlertMessage } from '@/components/ui/alert-message'
import { EmailForm } from './EmailForm'

interface EmailSendingSectionProps {
    certificateId: string
    dataSourceColumns: string[]
    variablesMapped: boolean
    emailSent: boolean
    scheduledDate?: Date | null
}

export function EmailSendingSection({
    // certificateId,
    dataSourceColumns,
    variablesMapped,
    emailSent,
    scheduledDate,
}: EmailSendingSectionProps) {
    const [emailColumn, setEmailColumn] = useState('')
    const [savedEmailColumn, setSavedEmailColumn] = useState('')
    const [sendMode, setSendMode] = useState<'now' | 'scheduled'>('now')
    const [scheduledDateTime, setScheduledDateTime] = useState('')
    const [scheduledTime, setScheduledTime] = useState('')
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [isSending, setIsSending] = useState(false)

    // Mock data - will come from API
    const hasInvalidEmails = savedEmailColumn === 'email' // Simula erro na coluna 'email'
    const totalRecipients = 45

    const handleSaveEmailColumn = () => {
        setSavedEmailColumn(emailColumn)
    }

    const handleSend = async () => {
        setIsSending(true)
        // TODO: Call API to send/schedule emails
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsSending(false)
    }

    const isEmailColumnSaved = !!savedEmailColumn
    const canSend =
        isEmailColumnSaved &&
        !hasInvalidEmails &&
        subject &&
        message &&
        variablesMapped &&
        (sendMode === 'now' ||
            (sendMode === 'scheduled' && scheduledDateTime && scheduledTime))
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
                {!isEmailColumnSaved && !emailSent && !isScheduled && (
                    <div className="bg-muted/50 border rounded-lg p-4">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 text-orange-600 dark:text-orange-400">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div className="text-sm">
                                <p className="font-medium">Coluna necessária</p>
                                <p className="text-muted-foreground">
                                    Selecione e salve a coluna que contém os
                                    emails dos destinatários para continuar.
                                </p>
                            </div>
                        </div>
                    </div>
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

                {/* Email Column Selection */}
                <div className="space-y-3">
                    <Label htmlFor="email-column">
                        Coluna com Email dos Destinatários
                    </Label>
                    <div className="flex gap-4 max-w-[30rem]">
                        <Select
                            value={emailColumn}
                            onValueChange={setEmailColumn}
                            disabled={emailSent || isScheduled}
                        >
                            <SelectTrigger id="email-column" className="flex-1">
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
                        <Button
                            variant="default"
                            onClick={handleSaveEmailColumn}
                            disabled={
                                !emailColumn ||
                                emailColumn === savedEmailColumn ||
                                emailSent ||
                                isScheduled
                            }
                        >
                            Salvar
                        </Button>
                    </div>

                    {/* Success: Column saved */}
                    {isEmailColumnSaved && !hasInvalidEmails && (
                        <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <p>
                                Coluna <strong>{savedEmailColumn}</strong>{' '}
                                selecionada.
                            </p>
                        </div>
                    )}

                    {/* Error: Invalid emails */}
                    {isEmailColumnSaved && hasInvalidEmails && (
                        <AlertMessage
                            variant="error"
                            icon={<AlertCircle className="w-5 h-5" />}
                            text="Emails inválidos detectados"
                            description={
                                <>
                                    A coluna <strong>{savedEmailColumn}</strong>{' '}
                                    contém linhas com emails inválidos. Por
                                    favor, corrija os dados ou selecione outra
                                    coluna.
                                </>
                            }
                        />
                    )}
                </div>

                {/* Send Mode Tabs */}
                {isEmailColumnSaved && !hasInvalidEmails && (
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
                                    totalRecords={totalRecipients}
                                    onSubjectChange={setSubject}
                                    onMessageChange={setMessage}
                                    onSubmit={handleSend}
                                    isSending={isSending}
                                    // isDisabled={!canSend || emailSent}
                                    isDisabled={false}
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
                                    totalRecords={totalRecipients}
                                    onSubjectChange={setSubject}
                                    onMessageChange={setMessage}
                                    onSubmit={handleSend}
                                    isSending={isSending}
                                    isDisabled={false}
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
