import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'
import { Check, X } from 'lucide-react'
import { columnTypeConfig } from '../../../../../../../../../../../../../../utils/columnTypeConfig'
import { ColumnHeaderMenu } from './components/ColumnHeaderMenu'
import { ColumnType } from '@/backend/domain/data-source-column'

export interface ColumnSettingsSheetProps {
    column: {
        name: string
        type: ColumnType
        arraySeparator: string | null
        arrayItemType?: ColumnType | null
    }
    originalColumn: {
        name: string
        type: ColumnType
        arraySeparator: string | null
        arrayItemType?: ColumnType | null
    }
    index: number
    isSelected: boolean
    isModified: boolean
    isPending: boolean
    emailSent: boolean
    isEditingCells: boolean
    availableTypes: [ColumnType, (typeof columnTypeConfig)[ColumnType]][]
    availableArrayItemTypes: [
        ColumnType,
        (typeof columnTypeConfig)[ColumnType],
    ][]
    setSelectedColumnIndex: (index: number | null) => void
    handleTypeChange: (index: number, type: ColumnType) => void
    handleSeparatorChange: (index: number, separator: string) => void
    handleArrayItemTypeChange: (index: number, itemType: ColumnType) => void
}

export function ColumnSettingsSheet({
    column,
    originalColumn,
    index,
    isSelected,
    isModified,
    isPending,
    emailSent,
    isEditingCells,
    availableTypes,
    availableArrayItemTypes,
    setSelectedColumnIndex,
    handleTypeChange,
    handleSeparatorChange,
    handleArrayItemTypeChange,
}: ColumnSettingsSheetProps) {
    const isDisabled = isPending || emailSent || isEditingCells

    return (
        <Sheet
            open={isSelected && !emailSent}
            onOpenChange={open => {
                if (emailSent) return
                setSelectedColumnIndex(open ? index : null)
            }}
        >
            <SheetTrigger asChild>
                <ColumnHeaderMenu
                    columnName={column.name}
                    type={column.type}
                    arrayItemType={column.arrayItemType}
                    isModified={isModified}
                    isSelected={isSelected}
                    disabled={isDisabled}
                />
            </SheetTrigger>
            <SheetContent
                showCloseButton={false}
                className="w-[80vw] sm:max-w-md overflow-y-auto px-6 py-6 bg-popover border-l-border/50 z-53"
            >
                <SheetHeader className="pb-4 mb-4 border-b flex flex-row items-center justify-between space-y-0">
                    <SheetTitle className="text-left text-lg text-foreground">
                        Coluna: {column.name}
                    </SheetTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedColumnIndex(null)}
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
                            {availableTypes.map(([key, itemConfig]) => {
                                const TypeIcon = itemConfig.icon
                                const isTypeSelected = column.type === key

                                return (
                                    <button
                                        key={key}
                                        onClick={() =>
                                            handleTypeChange(index, key)
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
                                            <span>{itemConfig.label}</span>
                                        </div>
                                        {key === originalColumn.type && (
                                            <div
                                                className="ml-auto flex items-center"
                                                title="Tipo salvo"
                                            >
                                                <Check className="size-4 text-foreground" />
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {column.type === 'array' && (
                        <div className="space-y-4 pt-4 border-t border-border/50">
                            <Label className="text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase tracking-wider">
                                Configurações da lista
                            </Label>
                            <div className="flex flex-col gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">
                                        Separador de itens
                                    </Label>
                                    <Input
                                        value={column.arraySeparator || ''}
                                        onChange={e =>
                                            handleSeparatorChange(
                                                index,
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Ex: , ou ;"
                                        className="h-9 font-mono bg-muted/50"
                                        minLength={1}
                                        maxLength={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">
                                        Tipo de cada item
                                    </Label>
                                    <Select
                                        value={column.arrayItemType || 'string'}
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
                                                ([key, itemConfig]) => {
                                                    const TypeIcon =
                                                        itemConfig.icon
                                                    return (
                                                        <SelectItem
                                                            key={key}
                                                            value={key}
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

                    {(column.type === 'boolean' ||
                        column.arrayItemType === 'boolean') && (
                        <div className="mt-3 px-4 py-2 bg-blue-800 text-zinc-100 rounded-md space-y-1">
                            <p className="font-semibold text-sm">
                                Valores booleanos válidos:
                            </p>
                            <ul className="text-xs text-zinc-300 space-y-1">
                                <li>
                                    <code className="font-mono">
                                        verdadeiro
                                    </code>{' '}
                                    / <code className="font-mono">falso</code>
                                </li>
                                <li>
                                    <code className="font-mono">true</code> /{' '}
                                    <code className="font-mono">false</code>
                                </li>
                                <li>
                                    <code className="font-mono">1</code> /{' '}
                                    <code className="font-mono">0</code>
                                </li>
                            </ul>
                        </div>
                    )}

                    {(column.type === 'date' ||
                        column.arrayItemType === 'date') && (
                        <div className="mt-3 px-4 py-2 bg-blue-800 text-zinc-100 rounded-md space-y-1">
                            <p className="font-semibold text-sm">
                                Valores de datas válidos:
                            </p>
                            <ul className="text-xs text-zinc-300 space-y-1">
                                <li>
                                    <code className="font-mono">
                                        dd/mm/yyyy [HH:mm[:ss]]
                                    </code>
                                </li>
                                <li>
                                    <code className="font-mono">
                                        mm/dd/yyyy [HH:mm[:ss]]
                                    </code>
                                </li>
                                <li>
                                    <code className="font-mono">
                                        yyyy-mm-dd [HH:mm[:ss]]
                                    </code>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
