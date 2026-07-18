'use client'

import { useEffect, useRef, useState } from 'react'
import { useUpdateSearchParams } from './useUpdateSearchParams'

export function useDebouncedSearchParam(search: string, delayMs = 400) {
    const updateParams = useUpdateSearchParams()
    const [searchInput, setSearchInput] = useState(search)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        setSearchInput(search)
    }, [search])

    useEffect(() => {
        if (searchInput === search) return
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            updateParams({ search: searchInput || null, page: null })
        }, delayMs)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [searchInput, search, delayMs, updateParams])

    return [searchInput, setSearchInput] as const
}
