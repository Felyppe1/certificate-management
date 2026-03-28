'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Plus, Loader2 } from 'lucide-react'
import { useCreationForm } from './useCreationForm'

export function CreationForm() {
    const { isOpen, setIsOpen, form, onSubmit, isSubmitting, errors } =
        useCreationForm()

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button size="lg">
                    <Plus />
                    Criar
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[16rem] xs:w-80 md:w-90"
                avoidCollisions
                side="bottom"
                align="end"
                collisionPadding={16}
            >
                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="space-y-4">
                        <label
                            htmlFor="emission-name"
                            className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2"
                        >
                            Nome da emissão
                        </label>
                        <Input
                            id="emission-name"
                            type="text"
                            placeholder="Ex: Seminário sobre Cybersecurity"
                            className="w-full mt-3 py-4 sm:py-5 dark:bg-bg"
                            disabled={isSubmitting}
                            {...form.register('name')}
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">
                                {errors.name.message}
                            </p>
                        )}
                    </div>
                    <Button
                        type="submit"
                        className="w-full"
                        size="default"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin" />
                                Criando...
                            </>
                        ) : (
                            'Criar Emissão'
                        )}
                    </Button>
                </form>
            </PopoverContent>
        </Popover>
    )
}
