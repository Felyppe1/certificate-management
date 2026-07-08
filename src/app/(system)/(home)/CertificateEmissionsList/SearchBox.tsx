'use client'

import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group'
import { Search } from 'lucide-react'
import { useCertificatesStore } from '@/lib/certificatesStore'

export default function SearchBox() {
    const inputValue = useCertificatesStore(state => state.inputValue)
    const setInputValue = useCertificatesStore(state => state.setInputValue)

    return (
        <InputGroup className="max-w-[20rem] w-full">
            <InputGroupAddon>
                <Search className="text-muted-foreground" />
            </InputGroupAddon>

            <InputGroupInput
                placeholder="Pesquisar emissão"
                value={inputValue}
                onChange={e => {
                    const v = e.target.value
                    setInputValue(v)
                }}
            />
        </InputGroup>
    )
}
