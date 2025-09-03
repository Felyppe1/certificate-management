'use client'

import { setFileUrlAction } from '@/server-actions/set-file-url-action'
import { useActionState } from 'react'

export function SetFileUrlForm() {
    const [state, action, isPending] = useActionState(setFileUrlAction, null)

    return (
        <form action={action}>
            <input type="text" name="file" id="file" />
            <button type="submit">Salvar</button>
        </form>
    )
}
