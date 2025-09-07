'use client'

import { createTemplateByUrlAction } from '@/server-actions/create-template-by-url-action'
import { useActionState } from 'react'

export function SetFileUrlForm({ certificateId }: { certificateId: string }) {
    const [state, action, isPending] = useActionState(
        createTemplateByUrlAction,
        null,
    )

    return (
        <div>
            {state?.success === false && state?.message && (
                <p style={{ color: 'red' }}>{state.message}</p>
            )}
            <form action={action}>
                <input
                    type="hidden"
                    name="certificateId"
                    value={certificateId}
                />
                <input type="text" name="fileUrl" id="fileUrl" />
                <button type="submit">Salvar</button>
            </form>
        </div>
    )
}
