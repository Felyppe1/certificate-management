'use client'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useUpdateSearchParams } from '@/custom-hooks/useUpdateSearchParams'

const SORT_OPTIONS = [
    { value: 'createdAt:desc', label: 'Mais recentes' },
    { value: 'createdAt:asc', label: 'Mais antigas' },
    { value: 'name:asc', label: 'Nome (A-Z)' },
    { value: 'name:desc', label: 'Nome (Z-A)' },
] as const

interface SortSelectProps {
    sort: string
}

export function SortSelect({ sort }: SortSelectProps) {
    const updateParams = useUpdateSearchParams()

    return (
        <Select
            value={sort}
            onValueChange={value =>
                updateParams({ sort: value }, { scroll: false })
            }
        >
            <SelectTrigger className="shrink-0">
                <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent align="end">
                {SORT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
