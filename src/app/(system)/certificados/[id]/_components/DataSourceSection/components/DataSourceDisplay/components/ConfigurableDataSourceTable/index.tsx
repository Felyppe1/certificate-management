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
import { Eye, Loader2, Download, Undo2, Save, Mail } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { PROCESSING_STATUS_ENUM } from '@/backend/domain/data-source-row'
import { ColumnType, FORBIDDEN_TYPE_CHANGE } from '@/backend/domain/data-source'
import { columnTypeConfig } from './components/ColumnSettingsSheet/components/ColumnHeaderMenu'
import { toast } from 'sonner'
import { updateDataSourceColumnsAction } from '@/backend/infrastructure/server-actions/update-data-source-columns-action'
import { viewCertificatesAction } from '@/backend/infrastructure/server-actions/view-certificates-action'
import { resendEmailsAction } from '@/backend/infrastructure/server-actions/resend-emails-action'
import { WarningPopover } from '../../../../../../../../../../components/WarningPopover'
import { ColumnSettingsSheet } from './components/ColumnSettingsSheet'

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
    emailSent?: boolean
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
    emailSent = false,
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

    const [resendEmailsState, resendEmailsActionHandler, isResendingEmails] =
        useActionState(resendEmailsAction, null)

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

    const handleResendSelected = () => {
        if (selectedRowIds.size === 0) return
        const formData = new FormData()
        formData.append('certificateId', certificateId)
        formData.append('rowIds', JSON.stringify([...selectedRowIds]))
        startTransition(() => {
            resendEmailsActionHandler(formData)
        })
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
        if (!resendEmailsState) return
        if (resendEmailsState.success) {
            toast.success(
                'Envio de e-mails agendado com sucesso para as linhas selecionadas.',
            )
            setSelectedRowIds(new Set())
        } else {
            toast.error('Ocorreu um erro ao reenviar os e-mails.')
        }
    }, [resendEmailsState])

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
                                            <ColumnSettingsSheet
                                                column={column}
                                                originalColumn={originalColumn}
                                                index={index}
                                                isSelected={isSelected}
                                                isModified={isModified}
                                                isPending={isPending}
                                                emailSent={emailSent}
                                                availableTypes={availableTypes}
                                                availableArrayItemTypes={
                                                    availableArrayItemTypes
                                                }
                                                setSelectedColumnIndex={
                                                    setSelectedColumnIndex
                                                }
                                                handleTypeChange={
                                                    handleTypeChange
                                                }
                                                handleSeparatorChange={
                                                    handleSeparatorChange
                                                }
                                                handleArrayItemTypeChange={
                                                    handleArrayItemTypeChange
                                                }
                                            />
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
                                    {emailSent && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleResendSelected}
                                            disabled={isResendingEmails}
                                        >
                                            {isResendingEmails ? (
                                                <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                                <Mail className="size-4" />
                                            )}
                                            Reenviar E-mail
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
