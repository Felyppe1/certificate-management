'use client'

import { ListRenderer } from './ListRenderer'
import { useCertificateEmissions } from '@/custom-hooks/useCertificateEmissions'

interface ListProps {
    search: string
    sort: string
    status: string
}

export function List({ search, sort, status }: ListProps) {
    const { data } = useCertificateEmissions({ search, sort, status })

    return (
        <ListRenderer
            certificateEmissions={data?.certificateEmissions ?? []}
            search={search}
        />
    )
}
