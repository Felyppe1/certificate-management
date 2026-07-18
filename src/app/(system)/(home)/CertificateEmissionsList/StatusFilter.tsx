'use client'

import { ListFilter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'
import { useUpdateSearchParams } from '@/custom-hooks/useUpdateSearchParams'
import { STATUS_MAPPING } from './CertificateEmissionsListData/List/ListRenderer'

interface StatusFilterProps {
    status: string
}

export function StatusFilter({ status }: StatusFilterProps) {
    const updateParams = useUpdateSearchParams()
    const selectedStatuses = status ? status.split(',') : []

    function handleToggle(value: CERTIFICATE_STATUS) {
        const next = selectedStatuses.includes(value)
            ? selectedStatuses.filter(
                  selectedStatus => selectedStatus !== value,
              )
            : [...selectedStatuses, value]

        updateParams({ status: next.join(',') || null }, { scroll: false })
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="shrink-0">
                    <ListFilter />
                    Status
                    {selectedStatuses.length > 0 &&
                        ` (${selectedStatuses.length})`}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {Object.values(CERTIFICATE_STATUS).map(value => (
                    <DropdownMenuCheckboxItem
                        key={value}
                        checked={selectedStatuses.includes(value)}
                        onSelect={event => event.preventDefault()}
                        onCheckedChange={() => handleToggle(value)}
                    >
                        {STATUS_MAPPING[value]}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
