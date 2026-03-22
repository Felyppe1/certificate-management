import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface EditableCellProps {
    initialValue: string
    originalValue: string
    rowId: string
    columnName: string
    onChange: (rowId: string, colName: string, value: string) => void
}

export function EditableCell({
    initialValue,
    originalValue,
    rowId,
    columnName,
    onChange,
}: EditableCellProps) {
    const [value, setValue] = useState(initialValue)
    const isModified = value !== originalValue

    useEffect(() => {
        setValue(initialValue)
    }, [initialValue])

    const handleBlur = () => {
        if (value !== initialValue) {
            onChange(rowId, columnName, value)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur()
        }
    }

    return (
        <Input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={cn(
                'h-8 min-w-[120px] rounded-none focus-visible:ring-1 focus-visible:ring-offset-0',
                isModified && 'dark:bg-primary/7',
            )}
        />
    )
}
