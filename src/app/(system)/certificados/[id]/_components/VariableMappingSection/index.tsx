'use client'

import { updateCertificateEmissionAction } from '@/backend/infrastructure/server-actions/update-certificate-emission-action'
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
import { ArrowRight, Undo2, CircleAlert } from 'lucide-react'
import { startTransition, useActionState, useEffect, useState } from 'react'

interface VariableMappingSectionProps {
    certificateId: string
    templateVariables: string[]
    dataSourceColumns: string[]
    existingMappings: Record<string, string | null> | null
}

export function VariableMappingSection({
    certificateId,
    templateVariables,
    dataSourceColumns,
    existingMappings = null,
}: VariableMappingSectionProps) {
    const [, mappingAction, mappingIsLoading] = useActionState(
        updateCertificateEmissionAction,
        null,
    )

    const [mappings, setMappings] = useState<Record<
        string,
        string | null
    > | null>(existingMappings)
    const [mappingsSaved, setMappingsSaved] = useState(false)

    useEffect(() => {
        setMappings(existingMappings)
        setMappingsSaved(false)
    }, [existingMappings])

    // Check if there were changes in relation to the initial mapping
    const hasMappingChanges = () => {
        if (!mappings || !existingMappings) return false

        const currentKeys = Object.keys(mappings).sort()
        const existingKeys = Object.keys(existingMappings).sort()

        if (currentKeys.length !== existingKeys.length) return true

        return currentKeys.some(key => mappings[key] !== existingMappings[key])
    }

    const hasChanges = hasMappingChanges()

    const allInitiallyMapped = templateVariables.every(
        variable => existingMappings?.[variable],
    )

    const hasInsufficientColumns =
        dataSourceColumns.length < templateVariables.length

    const handleMappingChange = (variable: string, column: string) => {
        setMappingsSaved(false)

        if (column === '__clear__') {
            setMappings(prev => ({
                ...prev,
                [variable]: null,
            }))

            return
        }

        setMappings(prev => ({
            ...prev,
            [variable]: column,
        }))
    }

    const getAvailableColumns = (currentVariable: string) => {
        if (!mappings) return dataSourceColumns

        const mappedColumns = Object.entries(mappings)
            .filter(([variable]) => variable !== currentVariable)
            .map(([, column]) => column)
            .filter((column): column is string => column !== null)

        return dataSourceColumns.filter(
            column => !mappedColumns.includes(column),
        )
    }

    const handleSave = async () => {
        const formData = new FormData()

        formData.append('id', certificateId)
        formData.append('variableColumnMapping', JSON.stringify(mappings))

        startTransition(() => {
            mappingAction(formData)
        })

        setMappingsSaved(true)
    }

    const handleUndoChanges = () => {
        setMappings(existingMappings)
        setMappingsSaved(false)
    }

    if (templateVariables.length === 0) {
        return null
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Mapeamento</CardTitle>
                        <CardDescription>
                            Mapeie as variáveis do template às colunas da base
                            de dados para serem substituídas na geração dos
                            certificados
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Aviso sobre colunas insuficientes */}
                {hasInsufficientColumns && (
                    <div className="bg-muted/50 border rounded-lg p-4">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 text-orange-600 dark:text-orange-400">
                                <CircleAlert className="size-4.5" />
                            </div>
                            <div className="text-sm">
                                <p className="font-medium mb-1">
                                    Colunas insuficientes
                                </p>
                                <p className="text-muted-foreground">
                                    A fonte de dados possui apenas{' '}
                                    {dataSourceColumns.length}{' '}
                                    {dataSourceColumns.length === 1
                                        ? 'coluna'
                                        : 'colunas'}
                                    , mas o template requer{' '}
                                    {templateVariables.length} variáveis. Todas
                                    as variáveis precisam ser mapeadas para
                                    gerar certificados.
                                </p>
                                {/* <p className="text-muted-foreground">
                                    Todas as variáveis precisam ser mapeadas
                                    para gerar certificados.
                                </p> */}
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 px-4 pb-2 border-b">
                        <div className="text-sm font-medium text-muted-foreground">
                            Variável do Template
                        </div>
                        <div className="w-8"></div>
                        <div className="text-sm font-medium text-muted-foreground">
                            Coluna da Fonte de Dados
                        </div>
                    </div>

                    {templateVariables.map(variable => {
                        const availableColumns = getAvailableColumns(variable)

                        return (
                            <div
                                key={variable}
                                className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center px-4  rounded-lg"
                            >
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className="font-mono"
                                    >
                                        {`{{ ${variable} }}`}
                                    </Badge>
                                </div>

                                <div className="flex items-center justify-center">
                                    <ArrowRight className="text-muted-foreground" />
                                </div>

                                <div>
                                    <Select
                                        value={mappings![variable] || ''}
                                        onValueChange={value => {
                                            handleMappingChange(variable, value)
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione uma coluna" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {mappings![variable] && (
                                                <SelectItem
                                                    value="__clear__"
                                                    className="text-muted-foreground italic"
                                                >
                                                    Desselecionar
                                                </SelectItem>
                                            )}
                                            {availableColumns.length === 0 ? (
                                                <p className="text-sm px-3 py-1">
                                                    Nenhuma coluna disponível
                                                </p>
                                            ) : (
                                                availableColumns.map(column => (
                                                    <SelectItem
                                                        key={column}
                                                        value={column}
                                                    >
                                                        {column}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="flex gap-4 pt-8 border-t">
                    <Button
                        onClick={handleSave}
                        disabled={mappingIsLoading || !hasChanges}
                        variant={mappingsSaved ? 'outline' : 'default'}
                    >
                        {mappingIsLoading
                            ? 'Salvando...'
                            : mappingsSaved
                              ? 'Mapeamento Salvo'
                              : 'Salvar Mapeamento'}
                    </Button>

                    {hasChanges && (
                        <Button
                            onClick={handleUndoChanges}
                            disabled={mappingIsLoading}
                            variant="outline"
                            size="sm"
                        >
                            <Undo2 className="" />
                            Desfazer Alterações
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
