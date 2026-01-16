'use client'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from '@/components/ui/select'
import { Type, Calendar, Hash, ToggleLeft, List } from 'lucide-react'
import { ColumnType, FORBIDDEN_TYPE_CHANGE } from '@/backend/domain/data-source'

interface ColumnTypeSelectProps {
    columnName: string
    type: ColumnType
    originalType: ColumnType
    separator?: string | null
    onTypeChange: (type: ColumnType) => void
    onSeparatorChange?: (separator: string) => void
    disabled?: boolean
}

export const columnTypeConfig: Record<
    ColumnType,
    { label: string; icon: any; iconColor: string }
> = {
    string: {
        label: 'Texto',
        icon: Type,
        iconColor: 'text-blue-500',
    },
    number: {
        label: 'Número',
        icon: Hash,
        iconColor: 'text-purple-500',
    },
    boolean: {
        label: 'Booleano',
        icon: ToggleLeft,
        iconColor: 'text-orange-500',
    },
    date: {
        label: 'Data',
        icon: Calendar,
        iconColor: 'text-green-500',
    },
    array: {
        label: 'Lista',
        icon: List,
        iconColor: 'text-pink-500',
    },
}

export function ColumnTypeSelect({
    columnName,
    type,
    originalType,
    separator,
    onTypeChange,
    onSeparatorChange,
    disabled = false,
}: ColumnTypeSelectProps) {
    const config = columnTypeConfig[type]
    const Icon = config.icon

    // Filter forbidden types based on the ORIGINAL type of the column
    const forbiddenTypes = FORBIDDEN_TYPE_CHANGE[originalType] || []
    const availableTypes = Object.entries(columnTypeConfig).filter(
        ([key]) => !forbiddenTypes.includes(key as ColumnType),
    )

    return (
        <div className="flex items-center gap-1">
            <Select
                value={type}
                onValueChange={value => onTypeChange(value as ColumnType)}
                disabled={disabled}
            >
                <SelectTrigger className="h-9 px-3 data-[placeholder]:text-muted-foreground w-auto gap-3 bg-secondary/50">
                    <span className="text-sm font-medium">{columnName}</span>
                    <div className="w-[1px] h-4 bg-muted-foreground/30" />
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon className={`size-3.5 ${config.iconColor}`} />
                        <span className="text-sm">{config.label}</span>
                    </div>
                </SelectTrigger>
                <SelectContent>
                    {availableTypes.map(([key, config]) => {
                        const TypeIcon = config.icon
                        return (
                            <SelectItem
                                key={key}
                                value={key}
                                className="flex items-center gap-2"
                            >
                                <div className="flex items-center gap-2">
                                    <TypeIcon
                                        className={`size-4 ${config.iconColor}`}
                                    />
                                    <span>{config.label}</span>
                                </div>
                            </SelectItem>
                        )
                    })}
                </SelectContent>
            </Select>

            {type === 'array' && onSeparatorChange && (
                <div className="flex items-center rounded-md bg-secondary/50 h-9 overflow-hidden">
                    <div className="px-2 text-xs text-muted-foreground bg-secondary/80 h-full flex items-center border-r border-muted-foreground/10 font-medium">
                        SEP
                    </div>
                    <input
                        type="text"
                        value={separator || ''}
                        onChange={e => onSeparatorChange(e.target.value)}
                        disabled={disabled}
                        className="w-10 h-full bg-transparent text-center text-sm focus:outline-none"
                        placeholder=","
                        maxLength={3}
                    />
                </div>
            )}
        </div>
    )
}
