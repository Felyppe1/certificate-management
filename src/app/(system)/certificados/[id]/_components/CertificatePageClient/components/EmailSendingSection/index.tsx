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
import { useEffect, useState } from 'react'
import { AlertMessage } from '@/components/ui/alert-message'
import { EmailForm } from './EmailForm'
import { Badge } from '@/components/ui/badge'
import { useEmailForm } from './useEmailForm'

interface EmailSendingSectionProps {
    certificateId: string
    dataSourceColumns: string[]
    variablesMapped: boolean
    emailSent: boolean
    scheduledDate?: Date | null
    totalRecipients: number
    certificatesGenerated: boolean
    emailData: {
        subject: string
        body: string
        emailColumn: string | null
        scheduledAt: Date | null
    } | null
}

export function EmailSendingSection({
    certificateId,
    dataSourceColumns,
    variablesMapped,
    emailSent,
    scheduledDate,
    totalRecipients,
    certificatesGenerated,
    emailData,
}: EmailSendingSectionProps) {
    const { form: emailForm, onSubmit } = useEmailForm({
        certificateId,
        totalRecipients,
        defaultValues: emailData
            ? {
                  subject: emailData.subject,
                  body: emailData.body,
                  emailColumn: emailData.emailColumn || '',
                  scheduledDate: emailData.scheduledAt
                      ? new Date(emailData.scheduledAt)
                            .toISOString()
                            .split('T')[0]
                      : '',
                  scheduledTime: emailData.scheduledAt
                      ? new Date(emailData.scheduledAt)
                            .toTimeString()
                            .slice(0, 5)
                      : '',
              }
            : undefined,
    })

    const [sendMode, setSendMode] = useState<'now' | 'scheduled'>(
        emailData?.scheduledAt ? 'scheduled' : 'now',
    )

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
                        variant="muted"
                        icon={<AlertCircle />}
                        text="Mapeamento de variáveis necessário"
                        description="Complete o mapeamento de variáveis para poder enviar os certificados."
                    />
                )}

                {/* Alert: Already Scheduled */}
                {isScheduled && !emailSent && (
                    <AlertMessage
                        variant="purple"
                        icon={<Clock />}
                        text="Envio agendado"
                        description={`Os emails serão enviados em ${scheduledDate?.toLocaleString('pt-BR')}`}
                    />
                )}

                {/* Alert: Already Sent */}
                {emailSent && (
                    <AlertMessage
                        variant="success"
                        icon={<CheckCircle2 />}
                        text="Emails enviados com sucesso"
                        description="Todos os certificados foram enviados para os destinatários."
                    />
                )}

                {/* Send Mode Tabs */}
                {/* {!emailSent && !isScheduled && ( */}
                <>
                    <Tabs
                        value={sendMode}
                        onValueChange={value =>
                            setSendMode(value as 'now' | 'scheduled')
                        }
                    >
                        <TabsList className="w-full grid grid-cols-[minmax(220px,_1fr)_minmax(220px,_1fr)] justify-start overflow-x-auto">
                            <TabsTrigger
                                value="now"
                                disabled={emailSent || isScheduled}
                            >
                                <Send />
                                Enviar Agora
                            </TabsTrigger>
                            <TabsTrigger
                                value="scheduled"
                                // disabled={emailSent || isScheduled}
                                disabled
                            >
                                <Calendar />
                                Agendar Envio
                                <Badge variant="purple" size="sm">
                                    Em Breve
                                </Badge>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="now" className="space-y-4 mt-4">
                            {!certificatesGenerated && (
                                <AlertMessage
                                    variant="warning"
                                    icon={<AlertCircle />}
                                    text="Para enviar os emails agora, é necessário gerar os certificados antes."
                                    className="mb-7"
                                />
                            )}

                            <EmailForm
                                form={emailForm}
                                dataSourceColumns={dataSourceColumns}
                                totalRecords={totalRecipients}
                                onSubmit={onSubmit}
                                isDisabled={
                                    emailSent ||
                                    isScheduled ||
                                    !certificatesGenerated
                                }
                                sendMode="now"
                                certificatesGenerated={certificatesGenerated}
                            />
                        </TabsContent>

                        <TabsContent
                            value="scheduled"
                            className="space-y-6 mt-4"
                        >
                            <EmailForm
                                form={emailForm}
                                dataSourceColumns={dataSourceColumns}
                                totalRecords={totalRecipients}
                                onSubmit={onSubmit}
                                isDisabled={
                                    emailSent ||
                                    isScheduled ||
                                    !certificatesGenerated
                                }
                                sendMode="scheduled"
                                certificatesGenerated={certificatesGenerated}
                            />
                        </TabsContent>
                    </Tabs>
                </>
                {/* )} */}
            </CardContent>
        </Card>
    )
}
