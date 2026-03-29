'use client'

import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { ReactNode } from 'react'

interface WarningPopoverProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
    title: string
    description: string
    children: ReactNode
}

export function WarningPopover({
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
    children,
}: WarningPopoverProps) {
    const handleConfirm = () => {
        onConfirm()
        onOpenChange(false)
    }

    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverAnchor asChild>{children}</PopoverAnchor>
            <PopoverContent
                className="w-[16rem] sm:w-80 px-4 sm:px-5 py-4"
                align="end"
            >
                <div className="space-y-5">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 text-orange-600 dark:text-orange-400 mt-0.5">
                                <AlertTriangle className="size-4 sm:size-5" />
                            </div>
                            <h4 className="font-semibold text-sm sm:text-base">
                                {title}
                            </h4>
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className="text-xs sm:text-sm">{description}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleConfirm}
                            className="bg-orange-500 hover:bg-orange-600"
                        >
                            Continuar
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
