'use client'

import { useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function useUpdateSearchParams() {
    const router = useRouter()
    const searchParams = useSearchParams()

    return useCallback(
        (
            updates: Record<string, string | null>,
            options?: { scroll?: boolean },
        ) => {
            const params = new URLSearchParams(searchParams.toString())
            for (const [key, value] of Object.entries(updates)) {
                if (value === null || value === '') params.delete(key)
                else params.set(key, value)
            }
            router.replace(`?${params.toString()}`, {
                scroll: options?.scroll ?? true,
            })
        },
        [router, searchParams],
    )
}
