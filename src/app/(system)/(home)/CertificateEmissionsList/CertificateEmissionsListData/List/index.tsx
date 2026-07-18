'use client'

import { ListRenderer } from './ListRenderer'
import { useCertificateEmissions } from '@/custom-hooks/useCertificateEmissions'

interface ListProps {
    search: string
}

export function List({ search }: ListProps) {
    const { data } = useCertificateEmissions(search)

    return (
        <ListRenderer
            certificateEmissions={data?.certificateEmissions ?? []}
            search={search}
        />
    )
}
