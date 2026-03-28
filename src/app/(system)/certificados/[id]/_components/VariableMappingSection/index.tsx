'use client'

import { updateCertificateEmissionAction } from '@/backend/infrastructure/server-actions/update-certificate-emission-action'
import { AlertMessage } from '@/components/ui/alert-message'
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    ArrowRight,
    Undo2,
    CircleAlert,
    Loader2,
    CheckCircle2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { WarningPopover } from '../../../../../../components/WarningPopover'
import { ColumnType } from '@/backend/domain/data-source'
import { columnTypeConfig } from '../columnTypeConfig'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { queryKeys } from '@/lib/query-keys'

interface DataSourceColumn {
    name: string
    type: ColumnType
    arrayItemType?: ColumnType | null
}

interface VariableMappingSectionProps {
    certificateId: string
    templateVariables: string[]
    dataSourceColumns: DataSourceColumn[]
    currentMapping: Record<string, string | null>
    emailSent: boolean
    certificatesGenerated: boolean
}

export function VariableMappingSection({
    certificateId,
    templateVariables,
    dataSourceColumns,
    currentMapping,
    emailSent,
    certificatesGenerated,
}: VariableMappingSectionProps) {
    const queryClient = useQueryClient()

    const { mutate: mappingAction, isPending: mappingIsLoading } = useMutation({
        mutationFn: async (formData: FormData) => {
            const result = await updateCertificateEmissionAction(null, formData)
            if (result?.success === false) {
                throw result
            }
            return result
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.certificateEmission(certificateId),
            })
            toast.success('Mapeamento salvo com sucesso')
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return

            console.error(error)
            toast.error('Ocorreu um erro ao tentar salvar o mapeamento')
        },
    })
    const [showMappingWarning, setShowMappingWarning] = useState(false)

    const [mappings, setMappings] = useState<Record<
        string,
        string | null
    > | null>(currentMapping)

    useEffect(() => {
        setMappings(currentMapping)
    }, [currentMapping])

    // Check if there were changes in relation to the initial mapping
    const hasMappingChanges = () => {
        if (!mappings || !currentMapping) return false

        const currentKeys = Object.keys(mappings).sort()
        const existingKeys = Object.keys(currentMapping).sort()

        if (currentKeys.length !== existingKeys.length) return true

        return currentKeys.some(key => mappings[key] !== currentMapping[key])
    }

    const allVariablesMapped = Object.values(currentMapping).every(
        mapping => mapping !== null,
    )

    const hasChanges = hasMappingChanges()

    // const allInitiallyMapped = templateVariables.every(
    //     variable => currentMapping?.[variable],
    // )

    const hasInsufficientColumns =
        dataSourceColumns.length < templateVariables.length

    const handleMappingChange = (variable: string, column: string) => {
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

    const isLoading = mappingIsLoading

    const getAvailableColumns = (currentVariable: string) => {
        if (!mappings) return dataSourceColumns

        const mappedColumns = Object.entries(mappings)
            .filter(([variable]) => variable !== currentVariable)
            .map(([, column]) => column)
            .filter((column): column is string => column !== null)

        return dataSourceColumns.filter(
            column => !mappedColumns.includes(column.name),
        )
    }

    const handleSaveClick = (e: React.MouseEvent) => {
        e.preventDefault()
        console.log(certificatesGenerated)
        if (certificatesGenerated) {
            setShowMappingWarning(true)
        } else {
            handleSave()
        }
    }

    const handleSave = async () => {
        const formData = new FormData()

        formData.append('id', certificateId)
        formData.append('variableColumnMapping', JSON.stringify(mappings))

        mappingAction(formData)
    }

    const handleUndoChanges = () => {
        setMappings(currentMapping)
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
                    <AlertMessage
                        variant="warning"
                        icon={<CircleAlert />}
                        text="Colunas insuficientes"
                        description={`
                        A fonte de dados possui 
                        ${dataSourceColumns.length} 
                        ${
                            dataSourceColumns.length === 1
                                ? 'coluna'
                                : 'colunas'
                        }, mas o template requer 
                        ${templateVariables.length} variáveis. Todas as variáveis precisam ser mapeadas para gerar certificados.`}
                    />
                )}

                {allVariablesMapped && (
                    <AlertMessage
                        variant="success"
                        icon={<CheckCircle2 className="size-4 sm:size-5" />}
                        text="Mapeamento realizado com sucesso"
                    />
                )}

                <Table>
                    <TableHeader>
                        <TableRow className="border-b hover:bg-transparent">
                            <TableHead className="text-muted-foreground">
                                Variável do Template
                            </TableHead>
                            <TableHead className="w-8"></TableHead>
                            <TableHead className="text-muted-foreground">
                                Coluna da Fonte de Dados
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {templateVariables.map(variable => {
                            const availableColumns =
                                getAvailableColumns(variable)

                            return (
                                <TableRow
                                    key={variable}
                                    className="hover:bg-transparent border-none"
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className="font-mono"
                                            >
                                                {`{{ ${variable} }}`}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center">
                                            <ArrowRight className="text-muted-foreground size-5 sm:size-auto" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="min-w-0">
                                            <Select
                                                value={
                                                    mappings![variable] || ''
                                                }
                                                onValueChange={value => {
                                                    handleMappingChange(
                                                        variable,
                                                        value,
                                                    )
                                                }}
                                                disabled={emailSent}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione uma coluna">
                                                        {(() => {
                                                            const selectedValue =
                                                                mappings![
                                                                    variable
                                                                ]
                                                            if (!selectedValue)
                                                                return 'Selecione uma coluna'

                                                            const selectedColumn =
                                                                dataSourceColumns.find(
                                                                    c =>
                                                                        c.name ===
                                                                        selectedValue,
                                                                )
                                                            if (!selectedColumn)
                                                                return selectedValue

                                                            const config =
                                                                columnTypeConfig[
                                                                    selectedColumn
                                                                        .type
                                                                ]
                                                            const baseColor =
                                                                config.iconColor
                                                            const Icon =
                                                                config.icon

                                                            const isArray =
                                                                selectedColumn.type ===
                                                                'array'
                                                            const arrayItemConfig =
                                                                isArray &&
                                                                selectedColumn.arrayItemType
                                                                    ? columnTypeConfig[
                                                                          selectedColumn
                                                                              .arrayItemType
                                                                      ]
                                                                    : null
                                                            const ArrayItemIcon =
                                                                arrayItemConfig?.icon

                                                            return (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex items-center">
                                                                        <Icon
                                                                            className={`size-4 ${baseColor}`}
                                                                        />
                                                                        {isArray &&
                                                                            ArrayItemIcon && (
                                                                                <ArrayItemIcon className="size-3 ml-0.5 text-muted-foreground opacity-70" />
                                                                            )}
                                                                    </div>
                                                                    <span>
                                                                        {
                                                                            selectedValue
                                                                        }
                                                                    </span>
                                                                </div>
                                                            )
                                                        })()}
                                                    </SelectValue>
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
                                                    {availableColumns.length ===
                                                    0 ? (
                                                        <p className="text-sm px-3 py-1">
                                                            Nenhuma coluna
                                                            disponível
                                                        </p>
                                                    ) : (
                                                        availableColumns.map(
                                                            column => {
                                                                const config =
                                                                    columnTypeConfig[
                                                                        column
                                                                            .type
                                                                    ]
                                                                const baseColor =
                                                                    config.iconColor
                                                                const Icon =
                                                                    config.icon

                                                                const isArray =
                                                                    column.type ===
                                                                    'array'
                                                                const arrayItemConfig =
                                                                    isArray &&
                                                                    column.arrayItemType
                                                                        ? columnTypeConfig[
                                                                              column
                                                                                  .arrayItemType
                                                                          ]
                                                                        : null
                                                                const ArrayItemIcon =
                                                                    arrayItemConfig?.icon

                                                                return (
                                                                    <SelectItem
                                                                        key={
                                                                            column.name
                                                                        }
                                                                        value={
                                                                            column.name
                                                                        }
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="flex items-center">
                                                                                <Icon
                                                                                    className={`size-4 ${baseColor}`}
                                                                                />
                                                                                {isArray &&
                                                                                    ArrayItemIcon && (
                                                                                        <ArrayItemIcon className="size-3 ml-0.5 text-muted-foreground opacity-70" />
                                                                                    )}
                                                                            </div>
                                                                            <span>
                                                                                {
                                                                                    column.name
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                    </SelectItem>
                                                                )
                                                            },
                                                        )
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>

                <div className="flex flex-wrap gap-4 pt-8 border-t">
                    <WarningPopover
                        open={showMappingWarning}
                        onOpenChange={setShowMappingWarning}
                        onConfirm={handleSave}
                        title="Alterar mapeamento de variáveis?"
                        description="Você precisará gerar os certificados novamente após esta ação."
                    >
                        <Button
                            onClick={handleSaveClick}
                            disabled={mappingIsLoading || !hasChanges}
                            variant={!hasChanges ? 'outline' : 'default'}
                        >
                            {mappingIsLoading ? (
                                <>
                                    <Loader2 className="animate-spin" />
                                    Salvando...
                                </>
                            ) : !hasChanges ? (
                                'Mapeamento Salvo'
                            ) : (
                                'Salvar Mapeamento'
                            )}
                        </Button>
                    </WarningPopover>

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
