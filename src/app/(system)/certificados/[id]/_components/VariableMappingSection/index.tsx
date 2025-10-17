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
import { Check, AlertCircle, ArrowRight } from 'lucide-react'
import { useState } from 'react'

interface VariableMappingSectionProps {
    templateVariables: string[]
    dataSourceColumns: string[]
    existingMappings?: Record<string, string>
    certificatesGenerated: boolean
    totalRecords: number
}

export function VariableMappingSection({
    templateVariables,
    dataSourceColumns,
    existingMappings = {},
    certificatesGenerated,
    totalRecords,
}: VariableMappingSectionProps) {
    const [mappings, setMappings] =
        useState<Record<string, string>>(existingMappings)
    const [isSaving, setIsSaving] = useState(false)
    const [mappingsSaved, setMappingsSaved] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)

    const handleMappingChange = (variable: string, column: string) => {
        setMappings(prev => ({
            ...prev,
            [variable]: column,
        }))
        setMappingsSaved(false)
    }

    const handleSave = async () => {
        setIsSaving(true)
        // TODO: Call API to save mappings
        await new Promise(resolve => setTimeout(resolve, 1000))
        setIsSaving(false)
        setMappingsSaved(true)
    }

    const handleGenerate = async () => {
        setIsGenerating(true)
        // TODO: Call API to generate certificates
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsGenerating(false)
    }

    const allMapped = templateVariables.every(variable => mappings[variable])
    const canSave = allMapped && !mappingsSaved
    const canGenerate = mappingsSaved && !certificatesGenerated

    if (templateVariables.length === 0) {
        return null
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Geração de Certificados</CardTitle>
                        <CardDescription>
                            Vincule as variáveis do template às colunas da base
                            de dados para gerar os certificados
                        </CardDescription>
                    </div>
                    {allMapped ? (
                        <Badge variant="green" size="md">
                            <Check />
                            Completo
                        </Badge>
                    ) : (
                        <Badge variant="orange" size="md">
                            <AlertCircle />
                            Incompleto
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* {!allMapped && (
                    <div className="bg-muted/50 border rounded-lg p-4">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 text-orange-600 dark:text-orange-400">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div className="text-sm">
                                <p className="font-medium">
                                    Mapeamento obrigatório
                                </p>
                                <p className="text-muted-foreground">
                                    É necessário mapear todas as variáveis antes
                                    de gerar os certificados.
                                </p>
                            </div>
                        </div>
                    </div>
                )} */}

                <div className="space-y-4">
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 px-4 pb-2 border-b">
                        <div className="text-sm font-medium text-muted-foreground">
                            Variável do Template
                        </div>
                        <div className="w-8"></div>
                        <div className="text-sm font-medium text-muted-foreground">
                            Coluna da Fonte de Dados
                        </div>
                    </div>

                    {/* Mappings */}
                    {templateVariables.map(variable => (
                        <div
                            key={variable}
                            className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center px-4  rounded-lg"
                        >
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono">
                                    {`{{ ${variable} }}`}
                                </Badge>
                            </div>

                            <div className="flex items-center justify-center">
                                <ArrowRight className="text-muted-foreground" />
                            </div>

                            <div>
                                <Select
                                    value={mappings[variable] || ''}
                                    onValueChange={value =>
                                        handleMappingChange(variable, value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma coluna" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dataSourceColumns.map(column => (
                                            <SelectItem
                                                key={column}
                                                value={column}
                                            >
                                                {column}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-4 pt-4 border-t">
                    {!mappingsSaved && (
                        <div className="bg-muted/50 border rounded-lg p-4">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium">
                                        Passo 1: Salvar Mapeamento
                                    </p>
                                    <p className="text-muted-foreground">
                                        Após mapear todas as variáveis, clique
                                        em &quot;Salvar Mapeamento&quot; para
                                        continuar.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                {mappingsSaved ? (
                                    <Badge variant="green" className="gap-1">
                                        <Check className="h-3 w-3" />
                                        Mapeamento Salvo
                                    </Badge>
                                ) : (
                                    <Badge variant="outline">
                                        Mapeamento Pendente
                                    </Badge>
                                )}
                            </div>
                            {certificatesGenerated && (
                                <Badge variant="green" className="gap-1">
                                    <Check className="h-3 w-3" />
                                    {totalRecords} Certificado
                                    {totalRecords !== 1 ? 's' : ''} Gerado
                                    {totalRecords !== 1 ? 's' : ''}
                                </Badge>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={handleSave}
                                disabled={!canSave || isSaving}
                                variant={mappingsSaved ? 'outline' : 'default'}
                            >
                                {isSaving
                                    ? 'Salvando...'
                                    : mappingsSaved
                                      ? 'Mapeamento Salvo'
                                      : 'Salvar Mapeamento'}
                            </Button>

                            {mappingsSaved && (
                                <Button
                                    onClick={handleGenerate}
                                    disabled={!canGenerate || isGenerating}
                                    size="lg"
                                >
                                    {isGenerating ? (
                                        <>
                                            <svg
                                                className="animate-spin h-4 w-4 mr-2"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                    fill="none"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            Gerando...
                                        </>
                                    ) : certificatesGenerated ? (
                                        'Gerar Novamente'
                                    ) : (
                                        'Gerar Certificados'
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
