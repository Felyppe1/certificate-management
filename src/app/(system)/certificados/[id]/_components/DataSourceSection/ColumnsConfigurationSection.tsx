'use client'

import { startTransition, useActionState, useEffect, useState } from 'react'
import { ColumnType } from '@/backend/domain/data-source'
import { ColumnTypeSelect } from './ColumnTypeSelect'
import { Button } from '@/components/ui/button'
import { Loader2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { RegenerateWarningPopover } from '../RegenerateWarningDialog'
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { updateDataSourceColumnsAction } from '@/backend/infrastructure/server-actions/update-data-source-columns-action'

interface ColumnsConfigurationSectionProps {
    certificateId: string
    columns: {
        name: string
        type: ColumnType
        arraySeparator: string | null
    }[]
    certificatesGenerated: boolean
}

export function ColumnsConfigurationSection({
    certificateId,
    columns: initialColumns,
    certificatesGenerated,
}: ColumnsConfigurationSectionProps) {
    const [columnsState, columnsAction, columnsIsLoading] = useActionState(
        updateDataSourceColumnsAction,
        null,
    )
    const [showSaveWarning, setShowSaveWarning] = useState(false)

    const [columns, setColumns] = useState(initialColumns)

    useEffect(() => {
        setColumns(initialColumns)
    }, [initialColumns])

    const hasChanges =
        JSON.stringify(columns) !== JSON.stringify(initialColumns)

    const handleTypeChange = (index: number, type: ColumnType) => {
        const newColumns = [...columns]
        const oldColumn = newColumns[index]

        const newColumn = { ...oldColumn, type }

        // Reset separator if not array
        if (type !== 'array') {
            newColumn.arraySeparator = null
        } else if (!newColumn.arraySeparator) {
            newColumn.arraySeparator = ','
        }

        newColumns[index] = newColumn
        setColumns(newColumns)
    }

    const handleSeparatorChange = (index: number, separator: string) => {
        const newColumns = [...columns]
        newColumns[index] = { ...newColumns[index], arraySeparator: separator }
        setColumns(newColumns)
    }

    const handleSave = async () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)
        formData.append('columns', JSON.stringify(columns))

        startTransition(() => {
            columnsAction(formData)
        })
    }

    const handleSaveClick = () => {
        if (certificatesGenerated) {
            setShowSaveWarning(true)
        } else {
            handleSave()
        }
    }

    const handleUndo = () => {
        setColumns(initialColumns)
    }

    useEffect(() => {
        if (!columnsState) return

        if (columnsState.success) {
            toast.success('Configuração salva com sucesso')
        } else if (columnsState.errorType === 'invalid-column-types') {
            const formatColumnList = (names: string[]): string => {
                if (names.length === 1) return names[0]

                return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
            }

            const columns =
                columnsState.invalidColumns?.map((col: any) => col.name) ?? []

            const isPlural = columns.length > 1

            const message = isPlural
                ? `Os tipos de dados escolhidos para as colunas ${formatColumnList(columns)} são inválidos`
                : `O tipo de dado escolhido para a coluna ${formatColumnList(columns)} é inválido`

            toast.error(message)
        } else {
            toast.error('Ocorreu um erro ao salvar a configuração')
        }
    }, [columnsState])

    if (!columns || columns.length === 0) {
        return <p>Nenhuma coluna encontrada</p>
    }

    return (
        <div className="space-y-4 mt-4 mb-2">
            {/* {columnsState?.errorType === 'invalid-column-types' &&
                columnsState.invalidColumns && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Erros de validação</AlertTitle>
                        <AlertDescription>
                            <div className="space-y-2 mt-2">
                                {columnsState.invalidColumns.map(
                                    (col: any, idx: number) => (
                                        <div key={idx} className="text-sm">
                                            Não é possível converter a coluna{' '}
                                            <strong>{col.name}</strong> para o
                                            tipo <strong>{col.toType}</strong>{' '}
                                            pois alguns valores não são
                                            compatíveis.
                                        </div>
                                    ),
                                )}
                            </div>
                        </AlertDescription>
                    </Alert>
                )} */}

            <div className="flex flex-wrap gap-3">
                {columns.map((column, index) => (
                    <ColumnTypeSelect
                        key={index}
                        columnName={column.name}
                        type={column.type}
                        originalType={initialColumns[index].type}
                        separator={column.arraySeparator}
                        onTypeChange={type => handleTypeChange(index, type)}
                        onSeparatorChange={sep =>
                            handleSeparatorChange(index, sep)
                        }
                    />
                ))}
            </div>
            <div className="flex flex-wrap gap-4 pt-4 border-t">
                <RegenerateWarningPopover
                    open={showSaveWarning}
                    onOpenChange={setShowSaveWarning}
                    onConfirm={handleSave}
                    title="Salvar alterações nas colunas?"
                >
                    <Button
                        onClick={handleSaveClick}
                        disabled={columnsIsLoading || !hasChanges}
                        variant={!hasChanges ? 'outline' : 'default'}
                    >
                        {columnsIsLoading ? (
                            <>
                                <Loader2 className="animate-spin mr-2" />
                                Salvando...
                            </>
                        ) : !hasChanges ? (
                            'Configuração Salva'
                        ) : (
                            'Salvar Configuração'
                        )}
                    </Button>
                </RegenerateWarningPopover>

                {hasChanges && (
                    <Button
                        onClick={handleUndo}
                        disabled={columnsIsLoading}
                        variant="outline"
                        size="sm"
                    >
                        <Undo2 className="mr-2 h-4 w-4" />
                        Desfazer Alterações
                    </Button>
                )}
            </div>
        </div>
    )
}
