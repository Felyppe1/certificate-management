'use client'

import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group'
import { Search } from 'lucide-react'
import { useDebouncedSearchParam } from '@/custom-hooks/useDebouncedSearchParam'

interface SearchBoxProps {
    search: string
}

export default function SearchBox({ search }: SearchBoxProps) {
    const [searchInput, setSearchInput] = useDebouncedSearchParam(search)

    return (
        <InputGroup className="max-w-[20rem] w-full">
            <InputGroupAddon>
                <Search className="text-muted-foreground" />
            </InputGroupAddon>

            <InputGroupInput
                placeholder="Pesquisar emissão"
                value={searchInput}
                onChange={e => {
                    const v = e.target.value
                    setSearchInput(v)
                }}
            />
        </InputGroup>
    )
}
