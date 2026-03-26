import { ColumnType } from '@/backend/domain/data-source'
import { Calendar, Hash, List, ToggleLeft, Type } from 'lucide-react'

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
