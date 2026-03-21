'use client'

import { useState, useEffect, useActionState, startTransition } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, Loader2, Download, Undo2, Save, X, Check } from 'lucide-react'
import { PROCESSING_STATUS_ENUM } from '@/backend/domain/data-source-row'
import { ColumnType, FORBIDDEN_TYPE_CHANGE } from '@/backend/domain/data-source'
import { ColumnHeaderMenu, columnTypeConfig } from './ColumnHeaderMenu'
import { toast } from 'sonner'
import { updateDataSourceColumnsAction } from '@/backend/infrastructure/server-actions/update-data-source-columns-action'
import { RegenerateWarningPopover } from '../RegenerateWarningDialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

interface ConfigurableDataSourceTableProps {
    certificateId: string
    rows: any[]
    columns: {
        name: string
        type: ColumnType
        arraySeparator: string | null
        arrayItemType?: ColumnType | null
    }[]
    certificatesGenerated: boolean
    handleViewCertificate: (rowId: string) => void
    isViewingCertificate: boolean
    viewingRowId: string | null
    handleDownloadAllCertificates: () => void
    totalBytes: number
}

function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))
    return `${size} ${sizes[i]}`
}

export function ConfigurableDataSourceTable({
    certificateId,
    rows,
    columns: initialColumns,
    certificatesGenerated,
    handleViewCertificate,
    isViewingCertificate,
    viewingRowId,
    handleDownloadAllCertificates,
    totalBytes,
}: ConfigurableDataSourceTableProps) {
    const [showAllRows, setShowAllRows] = useState(false)
    const [columns, setColumns] = useState(initialColumns)
    const [columnsState, columnsAction, isPending] = useActionState(
        updateDataSourceColumnsAction,
        null,
    )
    const [showSaveWarning, setShowSaveWarning] = useState(false)
    const [selectedColumnIndex, setSelectedColumnIndex] = useState<
        number | null
    >(null)

    useEffect(() => {
        setColumns(initialColumns)
        setSelectedColumnIndex(null)
    }, [initialColumns])

    useEffect(() => {
        if (!columnsState) return

        if (columnsState.success) {
            toast.success('Configuração salva com sucesso')
        } else if (columnsState.errorType === 'invalid-column-types') {
            const formatColumnList = (names: string[]): string => {
                if (names.length === 1) return names[0]
                return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
            }

            const invalidCols =
                columnsState.invalidColumns?.map((col: any) => col.name) ?? []

            const isPlural = invalidCols.length > 1

            const message = isPlural
                ? `Os tipos de dados escolhidos para as colunas ${formatColumnList(invalidCols)} são inválidos`
                : `O tipo de dado escolhido para a coluna ${formatColumnList(invalidCols)} é inválido`

            toast.error(message)
        } else {
            toast.error('Ocorreu um erro ao salvar a configuração')
        }
    }, [columnsState])

    const hasChanges =
        JSON.stringify(columns) !== JSON.stringify(initialColumns)

    const handleTypeChange = (index: number, type: ColumnType) => {
        const newColumns = [...columns]
        const oldColumn = newColumns[index]
        const newColumn = { ...oldColumn, type }

        if (type !== 'array') {
            newColumn.arraySeparator = null
            newColumn.arrayItemType = null
        } else {
            if (!newColumn.arraySeparator) {
                newColumn.arraySeparator = ','
            }
            if (!newColumn.arrayItemType) {
                newColumn.arrayItemType = 'string'
            }
        }

        newColumns[index] = newColumn
        setColumns(newColumns)
    }

    const handleSeparatorChange = (index: number, separator: string) => {
        const newColumns = [...columns]
        newColumns[index] = { ...newColumns[index], arraySeparator: separator }
        setColumns(newColumns)
    }

    const handleArrayItemTypeChange = (index: number, itemType: ColumnType) => {
        const newColumns = [...columns]
        newColumns[index] = { ...newColumns[index], arrayItemType: itemType }
        setColumns(newColumns)
    }

    const handleSave = () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)

        // Ensure we pass arrayItemType
        const payloadColumns = columns.map(c => ({
            name: c.name,
            type: c.type,
            arraySeparator: c.arraySeparator,
            arrayItemType: c.arrayItemType,
        }))

        formData.append('columns', JSON.stringify(payloadColumns))

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
        setSelectedColumnIndex(null)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        Linhas:{' '}
                        <span className="font-medium text-foreground">
                            {rows.length}
                        </span>
                    </div>
                </div>

                {hasChanges && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUndo}
                            disabled={isPending}
                        >
                            <Undo2 className="size-4" />
                            Desfazer
                        </Button>
                        <RegenerateWarningPopover
                            open={showSaveWarning}
                            onOpenChange={setShowSaveWarning}
                            onConfirm={handleSave}
                            title="Salvar alterações nas colunas?"
                        >
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleSaveClick}
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Save className="size-4" />
                                )}
                                Salvar Configuração
                            </Button>
                        </RegenerateWarningPopover>
                    </div>
                )}
            </div>

            <div className="flex flex-col xl:flex-row gap-4 relative items-start">
                <div className="border rounded-lg overflow-x-auto relative flex-1 w-full max-w-full">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent">
                                {certificatesGenerated && (
                                    <TableHead className="w-[80px] bg-muted/30 border-r border-border/50 sticky left-0 z-10 backdrop-blur">
                                        Ação
                                    </TableHead>
                                )}
                                {columns.map((column, index) => {
                                    const originalColumn = initialColumns[index]
                                    const isModified =
                                        column.type !== originalColumn.type ||
                                        column.arraySeparator !==
                                            originalColumn.arraySeparator ||
                                        column.arrayItemType !==
                                            originalColumn.arrayItemType

                                    const isSelected =
                                        selectedColumnIndex === index

                                    const forbiddenTypes = originalColumn
                                        ? FORBIDDEN_TYPE_CHANGE[
                                              originalColumn.type
                                          ] || []
                                        : []
                                    const availableTypes = Object.entries(
                                        columnTypeConfig,
                                    ).filter(
                                        ([key]) =>
                                            !forbiddenTypes.includes(
                                                key as ColumnType,
                                            ),
                                    ) as [
                                        ColumnType,
                                        (typeof columnTypeConfig)[ColumnType],
                                    ][]

                                    const availableArrayItemTypes =
                                        Object.entries(columnTypeConfig).filter(
                                            ([key]) => key !== 'array', // Lists of lists are not supported for now
                                        ) as [
                                            ColumnType,
                                            (typeof columnTypeConfig)[ColumnType],
                                        ][]

                                    return (
                                        <TableHead
                                            key={column.name}
                                            className="p-0 border-r border-border/50 last:border-r-0"
                                        >
                                            <Popover
                                                open={isSelected}
                                                onOpenChange={open =>
                                                    setSelectedColumnIndex(
                                                        open ? index : null,
                                                    )
                                                }
                                            >
                                                <PopoverTrigger asChild>
                                                    <ColumnHeaderMenu
                                                        columnName={column.name}
                                                        type={column.type}
                                                        arrayItemType={
                                                            column.arrayItemType
                                                        }
                                                        isModified={isModified}
                                                        isSelected={isSelected}
                                                        disabled={isPending}
                                                    />
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-[16rem] sm:w-[18rem] md:w-[20rem]"
                                                    avoidCollisions={false}
                                                >
                                                    <div className="flex items-center justify-between pr-4 py-3 rounded-t-xl">
                                                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                            Tipo de dado
                                                        </Label>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                setSelectedColumnIndex(
                                                                    null,
                                                                )
                                                            }
                                                            className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                                                        >
                                                            <X className="size-4" />
                                                        </Button>
                                                    </div>

                                                    <div className="space-y-6">
                                                        <div className="space-y-3">
                                                            <div className="flex flex-col gap-1">
                                                                {availableTypes.map(
                                                                    ([
                                                                        key,
                                                                        itemConfig,
                                                                    ]) => {
                                                                        const TypeIcon =
                                                                            itemConfig.icon
                                                                        const isTypeSelected =
                                                                            column.type ===
                                                                            key

                                                                        return (
                                                                            <button
                                                                                key={
                                                                                    key
                                                                                }
                                                                                onClick={() =>
                                                                                    handleTypeChange(
                                                                                        index,
                                                                                        key,
                                                                                    )
                                                                                }
                                                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left border outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                                                                                    isTypeSelected
                                                                                        ? 'bg-primary/7 border-primary/70 text-primary dark:text-blue-400 font-medium shadow-sm'
                                                                                        : 'border-border/80 hover:bg-muted hover:border-border text-foreground'
                                                                                }`}
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <TypeIcon
                                                                                        className={`size-4 ${itemConfig.iconColor}`}
                                                                                    />
                                                                                    <span>
                                                                                        {
                                                                                            itemConfig.label
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                                {key ===
                                                                                    originalColumn.type && (
                                                                                    <div
                                                                                        className="ml-auto flex items-center"
                                                                                        title="Tipo salvo"
                                                                                    >
                                                                                        <Check className="size-4 text-foreground" />
                                                                                    </div>
                                                                                )}
                                                                            </button>
                                                                        )
                                                                    },
                                                                )}
                                                            </div>
                                                            {/* {column.type === 'boolean' && (
                                                                <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-md">
                                                                    <p className="text-xs text-orange-600 dark:text-orange-400">
                                                                        Valores válidos na tabela: verdadeiro/falso, sim/não, true/false, 0/1.
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {column.type === 'date' && (
                                                                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                                                                    <p className="text-xs text-green-600 dark:text-green-400">
                                                                        Formatos aceitos: DD/MM/AAAA, AAAA-MM-DD e similares.
                                                                    </p>
                                                                </div>
                                                            )} */}
                                                        </div>

                                                        {column.type ===
                                                            'array' && (
                                                            <div className="space-y-4 pt-4 border-t border-border/50">
                                                                <Label className="text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase tracking-wider">
                                                                    Configurações
                                                                    da lista
                                                                </Label>
                                                                <div className="flex gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs text-muted-foreground">
                                                                            Separador
                                                                            de
                                                                            itens
                                                                        </Label>
                                                                        <Input
                                                                            value={
                                                                                column.arraySeparator ||
                                                                                ''
                                                                            }
                                                                            onChange={e =>
                                                                                handleSeparatorChange(
                                                                                    index,
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            placeholder="Ex: ,"
                                                                            className="h-9 w-16 font-mono bg-muted/50"
                                                                        />
                                                                    </div>

                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs text-muted-foreground">
                                                                            Tipo
                                                                            de
                                                                            cada
                                                                            item
                                                                        </Label>
                                                                        <Select
                                                                            value={
                                                                                column.arrayItemType ||
                                                                                'string'
                                                                            }
                                                                            onValueChange={val =>
                                                                                handleArrayItemTypeChange(
                                                                                    index,
                                                                                    val as ColumnType,
                                                                                )
                                                                            }
                                                                        >
                                                                            <SelectTrigger className="h-9 bg-muted/50">
                                                                                <SelectValue placeholder="Selecione o tipo" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {availableArrayItemTypes.map(
                                                                                    ([
                                                                                        key,
                                                                                        itemConfig,
                                                                                    ]) => {
                                                                                        const TypeIcon =
                                                                                            itemConfig.icon
                                                                                        return (
                                                                                            <SelectItem
                                                                                                key={
                                                                                                    key
                                                                                                }
                                                                                                value={
                                                                                                    key
                                                                                                }
                                                                                                className="cursor-pointer"
                                                                                            >
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <TypeIcon
                                                                                                        className={`size-3.5 ${itemConfig.iconColor}`}
                                                                                                    />
                                                                                                    <span>
                                                                                                        {
                                                                                                            itemConfig.label
                                                                                                        }
                                                                                                    </span>
                                                                                                </div>
                                                                                            </SelectItem>
                                                                                        )
                                                                                    },
                                                                                )}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(showAllRows ? rows : rows.slice(0, 10)).map(
                                (row, index) => (
                                    <TableRow
                                        key={index}
                                        className={
                                            row.processingStatus ===
                                            PROCESSING_STATUS_ENUM.FAILED
                                                ? 'bg-destructive/10 hover:bg-destructive/20'
                                                : ''
                                        }
                                    >
                                        {certificatesGenerated && (
                                            <TableCell className="border-r border-border/50 bg-background/95 sticky left-0 z-10 w-[80px]">
                                                <div className="flex gap-1">
                                                    {row.processingStatus ===
                                                        PROCESSING_STATUS_ENUM.COMPLETED && (
                                                        <Button
                                                            onClick={() =>
                                                                handleViewCertificate(
                                                                    row.id,
                                                                )
                                                            }
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            title="Visualizar certificado"
                                                            disabled={
                                                                isViewingCertificate &&
                                                                viewingRowId ===
                                                                    row.id
                                                            }
                                                        >
                                                            {isViewingCertificate &&
                                                            viewingRowId ===
                                                                row.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Eye className="size-4" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        )}
                                        {columns.map((column, colIndex) => {
                                            const isSelected =
                                                selectedColumnIndex === colIndex

                                            return (
                                                <TableCell
                                                    key={column.name}
                                                    className={`whitespace-nowrap border-r border-border/50 last:border-r-0 transition-colors ${isSelected ? 'bg-muted/30' : ''}`}
                                                >
                                                    {row.data[column.name] ||
                                                        '-'}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ),
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {rows.length > 10 && !showAllRows && (
                <div className="flex justify-center mt-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowAllRows(true)}
                        size="sm"
                    >
                        Mostrar todos os {rows.length} registros
                    </Button>
                </div>
            )}

            {rows.length > 10 && showAllRows && (
                <div className="flex justify-center mt-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowAllRows(false)}
                        size="sm"
                    >
                        Mostrar apenas 10 registros
                    </Button>
                </div>
            )}

            <div className="flex gap-x-4 gap-y-2 items-center flex-wrap mt-4">
                {certificatesGenerated && (
                    <>
                        <Button
                            size="sm"
                            onClick={handleDownloadAllCertificates}
                        >
                            <Download className="size-4" />
                            Baixar Todos
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            Tamanho total:{' '}
                            <span className="font-medium text-foreground">
                                {formatBytes(totalBytes)}
                            </span>
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
