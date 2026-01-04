import { UseFormReturn, useWatch } from 'react-hook-form'
import { FileSelectorType } from '.'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

interface UrlFormProps {
    urlForm: UseFormReturn<{ fileUrl: string }>
    onSubmitUrl: (data: { fileUrl: string }) => void
}

export function UrlForm({ urlForm, onSubmitUrl }: UrlFormProps) {
    return (
        <form
            onSubmit={urlForm.handleSubmit(onSubmitUrl)}
            className="flex gap-3"
        >
            <div className="w-full">
                <Input
                    type="url"
                    {...urlForm.register('fileUrl')}
                    placeholder="https://docs.google.com/..."
                    className={`${urlForm.formState.errors.fileUrl ? 'border-destructive focus-visible:ring-destructive' : ''} flex-1 px-4`}
                />
                {urlForm.formState.errors.fileUrl && (
                    <span className="text-sm text-destructive mt-2 block">
                        {urlForm.formState.errors.fileUrl.message}
                    </span>
                )}
            </div>
            <Button
                type="submit"
                disabled={
                    !urlForm.formState.isValid || urlForm.formState.isSubmitting
                }
            >
                Confirmar
            </Button>
        </form>
    )
}
