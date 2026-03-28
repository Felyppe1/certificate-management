'use client'

import { ListRenderer } from './ListRenderer'
import { ListLoading } from '../ListLoading'
import { useCertificateEmissions } from '@/custom-hooks/use-certificate-emissions'

export function List() {
    const { data, isLoading } = useCertificateEmissions()

    if (isLoading) return <ListLoading />

    return (
        <ListRenderer certificateEmissions={data?.certificateEmissions ?? []} />
    )
}
