import { UseFormReturn, useFieldArray } from 'react-hook-form'
import { FileSelectorType } from '.'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Plus, X } from 'lucide-react'

export type UrlFormValues = { fileUrls: { value: string }[] }

interface UrlFormProps {
    urlForm: UseFormReturn<UrlFormValues>
    onSubmitUrl: (data: UrlFormValues) => void
    type: FileSelectorType
}

export function UrlForm({ urlForm, onSubmitUrl, type }: UrlFormProps) {
    const { fields, append, remove } = useFieldArray({
        control: urlForm.control,
        name: 'fileUrls',
    })

    const canAddMore = type === 'data-source' && fields.length < 4

    return (
        <form
            onSubmit={urlForm.handleSubmit(onSubmitUrl)}
            className="flex flex-col gap-3"
        >
            {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                    <div className="w-full">
                        <Input
                            type="url"
                            {...urlForm.register(
                                `fileUrls.${index}.value` as const,
                            )}
                            placeholder="https://docs.google.com/..."
                            className={`${urlForm.formState.errors.fileUrls?.[index]?.value ? 'border-destructive focus-visible:ring-destructive' : ''} flex-1 px-4`}
                        />
                        {urlForm.formState.errors.fileUrls?.[index]?.value && (
                            <span className="text-sm text-destructive mt-2 block">
                                {
                                    urlForm.formState.errors.fileUrls[index]
                                        .value?.message
                                }
                            </span>
                        )}
                    </div>
                    {fields.length > 1 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => remove(index)}
                        >
                            <X className="size-4" />
                        </Button>
                    )}
                </div>
            ))}
            <div className="flex gap-3 items-center justify-between">
                {canAddMore ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ value: '' })}
                        className="gap-1"
                        disabled={urlForm.formState.isSubmitting}
                    >
                        <Plus className="h-4 w-4" />
                        Adicionar outra URL
                    </Button>
                ) : (
                    <div />
                )}
                <Button
                    type="submit"
                    disabled={
                        !urlForm.formState.isValid ||
                        urlForm.formState.isSubmitting
                    }
                >
                    Confirmar
                </Button>
            </div>
        </form>
    )
}
