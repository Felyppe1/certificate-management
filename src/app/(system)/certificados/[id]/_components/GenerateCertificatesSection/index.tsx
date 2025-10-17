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
import { Download, FileCheck, Loader2, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

interface GenerateCertificatesSectionProps {
    certificateId: string
    variablesMapped: boolean
    certificatesGenerated: boolean
    totalRecords: number
}

export function GenerateCertificatesSection({
    certificateId,
    variablesMapped,
    certificatesGenerated,
    totalRecords,
}: GenerateCertificatesSectionProps) {
    const [isGenerating, setIsGenerating] = useState(false)

    const handleGenerate = async () => {
        setIsGenerating(true)
        // TODO: Call API to generate certificates
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsGenerating(false)
    }

    const canGenerate = variablesMapped && !certificatesGenerated

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Gerar Certificados</CardTitle>
                        <CardDescription>
                            Gere os certificados para todos os participantes
                        </CardDescription>
                    </div>
                    {certificatesGenerated ? (
                        <Badge variant="green" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Gerado
                        </Badge>
                    ) : (
                        <Badge variant="outline">Pendente</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
                                    gerar os certificados.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {certificatesGenerated && (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="text-sm">
                                <p className="font-medium text-green-900 dark:text-green-100">
                                    Certificados gerados com sucesso
                                </p>
                                <p className="text-green-700 dark:text-green-300">
                                    {totalRecords} certificado
                                    {totalRecords !== 1 ? 's' : ''} gerado
                                    {totalRecords !== 1 ? 's' : ''} e pronto
                                    {totalRecords !== 1 ? 's' : ''} para
                                    download.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-4 items-center justify-between p-6 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                            <FileCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="font-medium text-lg">
                                {totalRecords} certificado
                                {totalRecords !== 1 ? 's' : ''}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {certificatesGenerated
                                    ? 'Gerados e disponíveis'
                                    : 'Serão gerados'}
                            </p>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        onClick={handleGenerate}
                        disabled={!canGenerate || isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Gerando...
                            </>
                        ) : certificatesGenerated ? (
                            <>
                                <Download className="h-4 w-4 mr-2" />
                                Gerar Novamente
                            </>
                        ) : (
                            <>
                                <FileCheck className="h-4 w-4 mr-2" />
                                Gerar Certificados
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
