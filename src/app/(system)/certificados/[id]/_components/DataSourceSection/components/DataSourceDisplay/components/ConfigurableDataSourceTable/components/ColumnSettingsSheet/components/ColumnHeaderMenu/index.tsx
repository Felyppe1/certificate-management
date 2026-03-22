'use client'

import { forwardRef } from 'react'
import { Type, Calendar, Hash, ToggleLeft, List, Settings2 } from 'lucide-react'
import { ColumnType } from '@/backend/domain/data-source'

interface ColumnHeaderMenuProps {
    columnName: string
    type: ColumnType
    arrayItemType?: ColumnType | null
    isModified?: boolean
    isSelected?: boolean
    disabled?: boolean
    onClick?: () => void
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
    date: {
        label: 'Data',
        icon: Calendar,
        iconColor: 'text-green-500',
    },
    boolean: {
        label: 'Booleano',
        icon: ToggleLeft,
        iconColor: 'text-orange-500',
    },
    array: {
        label: 'Lista',
        icon: List,
        iconColor: 'text-pink-500',
    },
}

export const ColumnHeaderMenu = forwardRef<
    HTMLButtonElement,
    ColumnHeaderMenuProps
>(
    (
        {
            columnName,
            type,
            arrayItemType,
            isModified = false,
            isSelected = false,
            disabled = false,
            onClick,
        },
        ref,
    ) => {
        const config = columnTypeConfig[type]
        const Icon = config?.icon || Type
        const ItemIcon = arrayItemType
            ? columnTypeConfig[arrayItemType]?.icon
            : null

        return (
            <button
                ref={ref}
                type="button"
                disabled={disabled}
                onClick={onClick}
                className={`flex items-center w-full min-w-[120px] sm:min-w-[150px] h-full min-h-[40px] justify-between gap-2 px-3 py-2 transition-all cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset border-x border-transparent hover:border-border/50 disabled:cursor-default 
                    ${
                        isSelected
                            ? 'bg-muted/80 ring-1 ring-border shadow-sm'
                            : 'hover:bg-muted/50 text-muted-foreground'
                    }
                    ${isModified ? 'bg-blue-500/7 text-foreground' : ''}`}
            >
                <div
                    className={`flex items-center gap-2 ${isSelected || isModified ? 'text-foreground' : ''}`}
                >
                    <div className="flex items-center">
                        <Icon className={`size-4 ${config.iconColor}`} />
                        {type === 'array' && ItemIcon && (
                            <ItemIcon
                                className={`size-3 ml-0.5 text-muted-foreground opacity-70`}
                            />
                        )}
                    </div>
                    <span
                        className={`whitespace-nowrap font-medium text-sm truncate`}
                    >
                        {columnName}
                    </span>
                </div>
                <Settings2
                    className={`size-4 ml-2 flex-shrink-0 ${isSelected ? 'opacity-100 text-foreground' : 'opacity-40'}`}
                />
            </button>
        )
    },
)
ColumnHeaderMenu.displayName = 'ColumnHeaderMenu'
