'use client'

import { uploadTemplateAction } from '@/server-actions/upload-template-action'
import { useActionState, useRef } from 'react'

export default function UploadTemplateForm() {
    const [state, action, isPending] = useActionState(
        uploadTemplateAction,
        null,
    )
    const formRef = useRef<HTMLFormElement>(null)

    function onChange(_: React.ChangeEvent<HTMLInputElement>) {
        formRef?.current?.requestSubmit()
    }

    return (
        <div>
            <form action={action} ref={formRef}>
                <input
                    type="file"
                    name="file"
                    id="file"
                    onChange={onChange}
                    disabled={isPending}
                />
            </form>
            {/* {state && state.success && (
                <div>
                    <p>Variáveis detectadas:</p>
                    <ul>
                        {state.variables.map(variable => (
                            <li key={variable}>{variable}</li>
                        ))}
                    </ul>
                </div>
            )} */}
        </div>
    )
}
