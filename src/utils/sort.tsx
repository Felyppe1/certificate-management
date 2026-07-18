import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

export interface SortCriteria<TField extends string> {
    field: TField
    order: 'asc' | 'desc'
}

export function parseSortParam<TField extends string>(
    sort: string | undefined,
    validFields: readonly TField[],
): SortCriteria<TField>[] {
    if (!sort) return []

    return sort.split(',').reduce<SortCriteria<TField>[]>((acc, part) => {
        const [field, order] = part.split(':')
        const isValidField = (validFields as readonly string[]).includes(field)
        const isValidOrder = order === 'asc' || order === 'desc'

        if (isValidField && isValidOrder) {
            acc.push({ field: field as TField, order })
        }

        return acc
    }, [])
}

export function serializeSortParam<TField extends string>(
    criteria: SortCriteria<TField>[],
): string {
    return criteria.map(({ field, order }) => `${field}:${order}`).join(',')
}

export function handleSortField<TField extends string>(
    criteria: SortCriteria<TField>[],
    field: TField,
): SortCriteria<TField>[] {
    const existing = criteria.find(criterion => criterion.field === field)

    if (!existing) return [...criteria, { field, order: 'asc' }]

    if (existing.order === 'asc') {
        return criteria.map(criterion =>
            criterion.field === field
                ? { ...criterion, order: 'desc' as const }
                : criterion,
        )
    }

    return criteria.filter(criterion => criterion.field !== field)
}

interface SortIconProps<TField extends string> {
    field: TField
    criteria: SortCriteria<TField>[]
}

export function SortIcon<TField extends string>({
    field,
    criteria,
}: SortIconProps<TField>) {
    const current = criteria.find(criterion => criterion.field === field)

    if (!current) {
        return <ChevronsUpDown className="size-3.5 text-muted-foreground/60" />
    }

    return current.order === 'asc' ? (
        <ArrowUp className="size-3.5" />
    ) : (
        <ArrowDown className="size-3.5" />
    )
}

export function SortPriority<TField extends string>({
    field,
    criteria,
}: SortIconProps<TField>) {
    if (criteria.length < 2) return null

    const index = criteria.findIndex(criterion => criterion.field === field)
    if (index === -1) return null

    return (
        <span className="text-xs text-muted-foreground ml-1">{index + 1}</span>
    )
}
