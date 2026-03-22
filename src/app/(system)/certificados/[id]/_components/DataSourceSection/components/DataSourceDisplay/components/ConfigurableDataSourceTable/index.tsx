'use client'

import {
    useState,
    useEffect,
    useActionState,
    startTransition,
    useCallback,
} from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { PROCESSING_STATUS_ENUM } from '@/backend/domain/data-source-row'
import { ColumnType, FORBIDDEN_TYPE_CHANGE } from '@/backend/domain/data-source'
import {
    ColumnHeaderMenu,
    columnTypeConfig,
} from './components/ColumnHeaderMenu'
import { toast } from 'sonner'
import { updateDataSourceColumnsAction } from '@/backend/infrastructure/server-actions/update-data-source-columns-action'
import { viewCertificatesAction } from '@/backend/infrastructure/server-actions/view-certificates-action'
import { WarningPopover } from '../../../../../../../../../../components/WarningPopover'
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
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'

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
    handleDownloadAllCertificates: () => void
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
    handleDownloadAllCertificates,
}: ConfigurableDataSourceTableProps) {
    const [showAllRows, setShowAllRows] = useState(false)
    const [columns, setColumns] = useState(initialColumns)
    const [columnsState, columnsAction, isPending] = useActionState(
        updateDataSourceColumnsAction,
        null,
    )
    const [showSaveWarning, setShowSaveWarning] = useState(false)
    const [showViewWarning, setShowViewWarning] = useState(false)
    const [selectedColumnIndex, setSelectedColumnIndex] = useState<
        number | null
    >(null)

    // Checkbox selection state
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
    const [isDownloadingSelected, setIsDownloadingSelected] = useState(false)

    const [
        viewCertificatesState,
        viewCertificatesActionHandler,
        isViewingCertificates,
    ] = useActionState(viewCertificatesAction, null)

    const completedRows = rows.filter(
        r => r.processingStatus === PROCESSING_STATUS_ENUM.COMPLETED,
    )
    const allCompleteSelected =
        completedRows.length > 0 &&
        completedRows.every(r => selectedRowIds.has(r.id))
    const someSelected = selectedRowIds.size > 0 && !allCompleteSelected

    const handleSelectAll = useCallback(() => {
        if (allCompleteSelected) {
            setSelectedRowIds(new Set())
        } else {
            setSelectedRowIds(new Set(completedRows.map(r => r.id)))
        }
    }, [allCompleteSelected, completedRows])

    const handleToggleRow = useCallback((rowId: string) => {
        setSelectedRowIds(prev => {
            const next = new Set(prev)
            if (next.has(rowId)) {
                next.delete(rowId)
            } else {
                next.add(rowId)
            }
            return next
        })
    }, [])

    const selectedCount = selectedRowIds.size

    const handleViewSelected = () => {
        if (selectedRowIds.size === 0) return
        const formData = new FormData()
        formData.append('rowIds', JSON.stringify([...selectedRowIds]))
        startTransition(() => {
            viewCertificatesActionHandler(formData)
        })
    }

    const handleDownloadSelected = async () => {
        setIsDownloadingSelected(true)
        try {
            const response = await fetch(
                `/api/certificate-emissions/${certificateId}/zip/selected`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rowIds: [...selectedRowIds] }),
                },
            )
            if (!response.ok) throw new Error('Download failed')
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `certificates-selected-${certificateId}.zip`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            toast.error(
                'Ocorreu um erro ao baixar os certificados selecionados',
            )
        } finally {
            setIsDownloadingSelected(false)
        }
    }

    useEffect(() => {
        setColumns(initialColumns)
        setSelectedColumnIndex(null)
    }, [initialColumns])

    useEffect(() => {
        if (!viewCertificatesState) return
        if (viewCertificatesState.success) {
            const results = viewCertificatesState.data as {
                rowId: string
                signedUrl: string
            }[]
            results.forEach(({ signedUrl }) => {
                window.open(signedUrl, '_blank', 'noopener,noreferrer')
            })
        } else {
            toast.error(
                'Ocorreu um erro ao visualizar os certificados selecionados',
            )
        }
    }, [viewCertificatesState])

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

    const totalBytes = rows.reduce((acc, row) => acc + (row.fileBytes || 0), 0)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-x-8 gap-y-2 flex-wrap">
                <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                        Linhas:{' '}
                        <span className="font-medium text-foreground">
                            {rows.length}
                        </span>
                    </div>
                    {certificatesGenerated && (
                        <p className="text-sm text-muted-foreground">
                            Tamanho total:{' '}
                            <span className="font-medium text-foreground">
                                {formatBytes(totalBytes)}
                            </span>
                        </p>
                    )}
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
                        <WarningPopover
                            open={showSaveWarning}
                            onOpenChange={setShowSaveWarning}
                            onConfirm={handleSave}
                            title="Salvar alterações nas colunas?"
                            description="Você precisará gerar os certificados novamente após esta ação."
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
                                Salvar
                            </Button>
                        </WarningPopover>
                    </div>
                )}
            </div>

            <div className="flex flex-col xl:flex-row gap-4 relative items-start">
                <div className="border rounded-lg overflow-x-auto relative flex-1 w-full max-w-full">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent">
                                {certificatesGenerated && (
                                    <TableHead className="w-[5.3rem] bg-muted/30 border-r border-border/50 sticky -left-1 z-10 backdrop-blur">
                                        <div className="flex justify-center items-center px-2">
                                            <Checkbox
                                                checked={allCompleteSelected}
                                                onCheckedChange={
                                                    handleSelectAll
                                                }
                                                aria-label="Selecionar todos"
                                                disabled={
                                                    completedRows.length === 0
                                                }
                                                className="data-[state=indeterminate]:bg-primary"
                                                data-state={
                                                    allCompleteSelected
                                                        ? 'checked'
                                                        : someSelected
                                                          ? 'indeterminate'
                                                          : 'unchecked'
                                                }
                                            />
                                        </div>
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
                                            <Sheet
                                                open={isSelected}
                                                onOpenChange={open =>
                                                    setSelectedColumnIndex(
                                                        open ? index : null,
                                                    )
                                                }
                                            >
                                                <SheetTrigger asChild>
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
                                                </SheetTrigger>
                                                <SheetContent
                                                    showCloseButton={false}
                                                    className="w-[80vw] sm:max-w-md overflow-y-auto px-6 py-6 bg-popover border-l-border/50 z-53"
                                                >
                                                    <SheetHeader className="pb-4 mb-4 border-b flex flex-row items-center justify-between space-y-0">
                                                        <SheetTitle className="text-left text-lg text-foreground">
                                                            Coluna:{' '}
                                                            {column.name}
                                                        </SheetTitle>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                setSelectedColumnIndex(
                                                                    null,
                                                                )
                                                            }
                                                            className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                        >
                                                            <X className="size-4" />
                                                        </Button>
                                                    </SheetHeader>

                                                    <div className="space-y-8">
                                                        <div className="space-y-4">
                                                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                                Tipo de dado
                                                            </Label>
                                                            <div className="flex flex-col gap-2">
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
                                                        </div>

                                                        {column.type ===
                                                            'array' && (
                                                            <div className="space-y-4 pt-4 border-t border-border/50">
                                                                <Label className="text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase tracking-wider">
                                                                    Configurações
                                                                    da lista
                                                                </Label>
                                                                <div className="flex flex-col gap-4">
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
                                                                            placeholder="Ex: , ou ;"
                                                                            className="h-9 font-mono bg-muted/50"
                                                                            minLength={
                                                                                1
                                                                            }
                                                                            maxLength={
                                                                                3
                                                                            }
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
                                                                            <SelectContent className="z-55">
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

                                                        {(column.type ===
                                                            'boolean' ||
                                                            column.arrayItemType ===
                                                                'boolean') && (
                                                            <div className="mt-3 px-4 py-2 bg-blue-800 text-zinc-100 rounded-md space-y-1">
                                                                <p className="font-semibold text-sm">
                                                                    Valores
                                                                    booleanos
                                                                    válidos:
                                                                </p>
                                                                <ul className="text-xs text-zinc-300 space-y-1">
                                                                    <li>
                                                                        <code className="font-mono">
                                                                            verdadeiro
                                                                        </code>{' '}
                                                                        /{' '}
                                                                        <code className="font-mono">
                                                                            falso
                                                                        </code>
                                                                    </li>
                                                                    <li>
                                                                        <code className="font-mono">
                                                                            true
                                                                        </code>{' '}
                                                                        /{' '}
                                                                        <code className="font-mono">
                                                                            false
                                                                        </code>
                                                                    </li>
                                                                    <li>
                                                                        <code className="font-mono">
                                                                            1
                                                                        </code>{' '}
                                                                        /{' '}
                                                                        <code className="font-mono">
                                                                            0
                                                                        </code>
                                                                    </li>
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {(column.type ===
                                                            'date' ||
                                                            column.arrayItemType ===
                                                                'date') && (
                                                            <div className="mt-3 px-4 py-2 bg-blue-800 text-zinc-100 rounded-md space-y-1">
                                                                <p className="font-semibold text-sm">
                                                                    Valores de
                                                                    datas
                                                                    válidos:
                                                                </p>
                                                                <ul className="text-xs text-zinc-300 space-y-1">
                                                                    <li>
                                                                        <code className="font-mono">
                                                                            dd/mm/yyyy
                                                                            [HH:mm[:ss]]
                                                                        </code>
                                                                    </li>
                                                                    <li>
                                                                        <code className="font-mono">
                                                                            mm/dd/yyyy
                                                                            [HH:mm[:ss]]
                                                                        </code>
                                                                    </li>
                                                                    <li>
                                                                        <code className="font-mono">
                                                                            yyyy-mm-dd
                                                                            [HH:mm[:ss]]
                                                                        </code>
                                                                    </li>
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </SheetContent>
                                            </Sheet>
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
                                            <TableCell
                                                className={`border-r border-border/50 sticky -left-1 z-10 w-[5.3rem] ${row.processingStatus === PROCESSING_STATUS_ENUM.FAILED ? 'bg-destructive/10' : 'bg-card'}`}
                                            >
                                                <div className="flex justify-center items-center">
                                                    {row.processingStatus ===
                                                    PROCESSING_STATUS_ENUM.COMPLETED ? (
                                                        <Checkbox
                                                            checked={selectedRowIds.has(
                                                                row.id,
                                                            )}
                                                            onCheckedChange={() =>
                                                                handleToggleRow(
                                                                    row.id,
                                                                )
                                                            }
                                                            aria-label="Selecionar linha"
                                                        />
                                                    ) : (
                                                        <Checkbox
                                                            disabled
                                                            aria-label="Não disponível"
                                                        />
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
                        {selectedCount > 0 && (
                            <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <span className="text-sm text-muted-foreground">
                                    {selectedCount}{' '}
                                    {selectedCount === 1
                                        ? 'selecionado'
                                        : 'selecionados'}
                                </span>

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleDownloadSelected}
                                        disabled={isDownloadingSelected}
                                    >
                                        {isDownloadingSelected ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <Download className="size-4" />
                                        )}
                                        Baixar
                                    </Button>
                                    {selectedCount > 5 ? (
                                        <WarningPopover
                                            open={showViewWarning}
                                            onOpenChange={setShowViewWarning}
                                            onConfirm={handleViewSelected}
                                            title={`Abrir ${selectedCount} abas?`}
                                            description="Cada certificado selecionado será aberto em uma aba separada."
                                        >
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() =>
                                                    setShowViewWarning(true)
                                                }
                                                disabled={isViewingCertificates}
                                            >
                                                {isViewingCertificates ? (
                                                    <Loader2 className="size-4 animate-spin" />
                                                ) : (
                                                    <Eye className="size-4" />
                                                )}
                                                Visualizar
                                            </Button>
                                        </WarningPopover>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleViewSelected}
                                            disabled={isViewingCertificates}
                                        >
                                            {isViewingCertificates ? (
                                                <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                                <Eye className="size-4" />
                                            )}
                                            Visualizar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
